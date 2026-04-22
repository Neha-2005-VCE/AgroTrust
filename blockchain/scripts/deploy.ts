import { ethers } from "hardhat";

async function main() {
  const AgroFundEscrow = await ethers.getContractFactory("AgroFundEscrow");
  const contract = await AgroFundEscrow.deploy();
  await contract.waitForDeployment();
  console.log("AgroFundEscrow deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
