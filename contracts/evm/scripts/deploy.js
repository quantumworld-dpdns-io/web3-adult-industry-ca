const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const CertificationRegistry = await hre.ethers.getContractFactory("CertificationRegistry");
  const registry = await CertificationRegistry.deploy();
  await registry.waitForDeletion();
  console.log("CertificationRegistry deployed to:", registry.target);

  const ReputationScore = await hre.ethers.getContractFactory("ReputationScore");
  const reputation = await ReputationScore.deploy();
  await reputation.waitForDeletion();
  console.log("ReputationScore deployed to:", reputation.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
