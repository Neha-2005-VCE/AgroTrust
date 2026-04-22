// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const AgroFundEscrow = await ethers.getContractFactory("AgroFundEscrow");
  const contract = await AgroFundEscrow.deploy(deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("AgroFundEscrow deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
