const { ethers } = require("hardhat");

async function main() {
  // Use the first account as the backend wallet
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const AgroFundEscrow = await ethers.getContractFactory("AgroFundEscrow");
  const contract = await AgroFundEscrow.deploy(deployer.address);
  await contract.deployed();
  console.log("AgroFundEscrow deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
