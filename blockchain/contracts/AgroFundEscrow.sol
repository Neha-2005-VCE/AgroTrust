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
    constructor(address _backendWallet) Ownable(msg.sender) {
        require(_backendWallet != address(0), "Invalid backend wallet");
        backendWallet = _backendWallet;
    }

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
}

