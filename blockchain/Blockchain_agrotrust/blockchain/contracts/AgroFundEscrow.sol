// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgroFundEscrow
 * @notice Manages investor deposits, milestone-based fund release to farmers,
 *         and proportional refunds for the AgroTrust platform.
 * @dev Only the designated backend wallet can trigger state-changing operations
 *      (create projects, release milestones, issue refunds).
 */
contract AgroFundEscrow is Ownable, ReentrancyGuard {
    // ──────────────────────────── Types ────────────────────────────

    struct Project {
        address payable farmer;
        uint256 totalFunded;
        uint256 releasedAmount;
        uint8 currentMilestone; // 0 = not started, 1-4 = completed stages
        bool completed;
        bool failed;
    }

    // ──────────────────────────── State ────────────────────────────

    address public backendWallet;

    /// @dev projectId => Project
    mapping(uint256 => Project) public projects;

    /// @dev projectId => investor => amount deposited
    mapping(uint256 => mapping(address => uint256)) public investorAmounts;

    /// @dev projectId => list of unique investor addresses
    mapping(uint256 => address[]) public investorLists;

    /// @dev projectId => investor => whether already recorded in investorLists
    mapping(uint256 => mapping(address => bool)) private _isInvestor;

    // Milestone release percentages (basis points, sum = 10 000)
    uint16[4] public milestonePercents = [2000, 2500, 3000, 2500]; // 20%, 25%, 30%, 25%

    // ──────────────────────────── Events ───────────────────────────

    event ProjectCreated(uint256 indexed projectId, address indexed farmer);
    event FundsDeposited(uint256 indexed projectId, address indexed investor, uint256 amount);
    event MilestoneReleased(uint256 indexed projectId, uint8 stage, uint256 amount);
    event FundsRefunded(uint256 indexed projectId, address indexed investor, uint256 amount);
    event ProjectCompleted(uint256 indexed projectId);

    // ──────────────────────────── Modifiers ────────────────────────

    modifier onlyBackend() {
        require(msg.sender == backendWallet, "Not authorized");
        _;
    }

    // ──────────────────────────── Constructor ──────────────────────

    /**
     * @param _backendWallet Address of the platform backend that is allowed
     *        to call restricted functions (createProject, releaseMilestone, refund).
     */
    constructor(address _backendWallet) Ownable(msg.sender) {
        require(_backendWallet != address(0), "Invalid backend wallet");
        backendWallet = _backendWallet;
    }

    // ──────────────────────────── Write functions ──────────────────

    /**
     * @notice Register a new agricultural project.
     * @param projectId Unique identifier for the project.
     * @param farmer    Wallet address of the farmer who will receive funds.
     */
    function createProject(uint256 projectId, address payable farmer) external onlyBackend {
        require(farmer != address(0), "Invalid farmer address");
        require(projects[projectId].farmer == address(0), "Project already exists");

        projects[projectId] = Project({
            farmer: farmer,
            totalFunded: 0,
            releasedAmount: 0,
            currentMilestone: 0,
            completed: false,
            failed: false
        });

        emit ProjectCreated(projectId, farmer);
    }

    /**
     * @notice Deposit funds into a project's escrow.
     * @param projectId The project to fund.
     */
    function depositFunds(uint256 projectId) external payable nonReentrant {
        Project storage p = projects[projectId];
        require(p.farmer != address(0), "Project does not exist");
        require(!p.completed, "Project already completed");
        require(!p.failed, "Project has failed");
        require(msg.value > 0, "Must send some funds");

        p.totalFunded += msg.value;
        investorAmounts[projectId][msg.sender] += msg.value;

        if (!_isInvestor[projectId][msg.sender]) {
            investorLists[projectId].push(msg.sender);
            _isInvestor[projectId][msg.sender] = true;
        }

        emit FundsDeposited(projectId, msg.sender, msg.value);
    }

    /**
     * @notice Release the next milestone payment to the farmer.
     * @param projectId The project whose milestone to release.
     * @param stage     The milestone stage (1-4). Must equal currentMilestone + 1.
     */
    function releaseMilestone(uint256 projectId, uint8 stage) external onlyBackend nonReentrant {
        Project storage p = projects[projectId];
        require(p.farmer != address(0), "Project does not exist");
        require(!p.completed, "Project already completed");
        require(!p.failed, "Project has failed");
        require(stage >= 1 && stage <= 4, "Invalid stage");
        require(stage == p.currentMilestone + 1, "Milestones must be sequential");

        uint256 amount = (p.totalFunded * milestonePercents[stage - 1]) / 10000;
        p.releasedAmount += amount;
        p.currentMilestone = stage;

        if (stage == 4) {
            p.completed = true;
            // Release any remaining dust due to rounding
            uint256 remaining = address(this).balance >= (p.totalFunded - p.releasedAmount)
                ? (p.totalFunded - p.releasedAmount)
                : 0;
            if (remaining > 0) {
                amount += remaining;
                p.releasedAmount += remaining;
            }
            emit ProjectCompleted(projectId);
        }

        (bool sent, ) = p.farmer.call{value: amount}("");
        require(sent, "Transfer to farmer failed");

        emit MilestoneReleased(projectId, stage, amount);
    }

    /**
     * @notice Mark project as failed and refund all investors proportionally
     *         based on the funds still held in escrow.
     * @param projectId The project to refund.
     */
    function refund(uint256 projectId) external onlyBackend nonReentrant {
        Project storage p = projects[projectId];
        require(p.farmer != address(0), "Project does not exist");
        require(!p.completed, "Cannot refund completed project");
        require(!p.failed, "Already refunded");

        p.failed = true;

        uint256 refundPool = p.totalFunded - p.releasedAmount;
        if (refundPool == 0) return;

        address[] storage investors = investorLists[projectId];
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 share = investorAmounts[projectId][investor];
            if (share == 0) continue;

            uint256 refundAmount = (share * refundPool) / p.totalFunded;
            if (refundAmount == 0) continue;

            investorAmounts[projectId][investor] = 0;
            (bool sent, ) = payable(investor).call{value: refundAmount}("");
            require(sent, "Refund transfer failed");

            emit FundsRefunded(projectId, investor, refundAmount);
        }
    }

    // ──────────────────────────── View functions ───────────────────

    /**
     * @notice Get the amount an investor deposited into a project.
     */
    function getInvestorShare(uint256 projectId, address investor) external view returns (uint256) {
        return investorAmounts[projectId][investor];
    }

    /**
     * @notice Get high-level project details.
     */
    function getProject(uint256 projectId)
        external
        view
        returns (
            address farmer,
            uint256 totalFunded,
            uint256 releasedAmount,
            uint8 currentMilestone,
            bool completed,
            bool failed
        )
    {
        Project storage p = projects[projectId];
        return (p.farmer, p.totalFunded, p.releasedAmount, p.currentMilestone, p.completed, p.failed);
    }

    /**
     * @notice Get the number of investors in a project.
     */
    function getInvestorCount(uint256 projectId) external view returns (uint256) {
        return investorLists[projectId].length;
    }

    // ──────────────────────────── Admin ────────────────────────────

    /**
     * @notice Update the backend wallet address. Only the contract owner can call.
     */
    function setBackendWallet(address _newBackend) external onlyOwner {
        require(_newBackend != address(0), "Invalid address");
        backendWallet = _newBackend;
    }
}
