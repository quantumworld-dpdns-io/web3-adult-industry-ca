const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const CertificationRegistry = await ethers.getContractFactory("CertificationRegistry");
  const registry = await CertificationRegistry.deploy();
  await registry.waitForDeployment();
  console.log("CertificationRegistry deployed to:", await registry.getAddress());

  const ReputationScore = await ethers.getContractFactory("ReputationScore");
  const reputation = await ReputationScore.deploy();
  await reputation.waitForDeployment();
  console.log("ReputationScore deployed to:", await reputation.getAddress());

  console.log("\nDeployment complete!");
  console.log("CertificationRegistry:", await registry.getAddress());
  console.log("ReputationScore:", await reputation.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
