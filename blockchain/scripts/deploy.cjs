const { ethers } = require("hardhat");

async function main() {
  const AgroFundEscrow = await ethers.getContractFactory("AgroFundEscrow");
  const contract = await AgroFundEscrow.deploy();
  await contract.deployed();
  console.log("AgroFundEscrow deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
