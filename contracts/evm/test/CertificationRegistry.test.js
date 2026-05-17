const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificationRegistry", function () {
  let registry, reputation, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CertificationRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
    const Reputation = await ethers.getContractFactory("ReputationScore");
    reputation = await Reputation.deploy();
    await reputation.waitForDeployment();
  });

  it("should register a DID", async function () {
    await registry.registerDID("did:ca:alice", "https://example.com/alice.json");
    const count = await registry.getDIDCount();
    expect(count).to.equal(1);
  });

  it("should reject duplicate DID registration", async function () {
    await registry.registerDID("did:ca:alice", "https://example.com/alice.json");
    await expect(
      registry.registerDID("did:ca:alice", "https://example.com/alice.json")
    ).to.be.revertedWith("DID already exists and is active");
  });

  it("should update a DID document URI", async function () {
    await registry.registerDID("did:ca:alice", "https://example.com/alice.json");
    await registry.updateDID("did:ca:alice", "https://example.com/alice-v2.json");
    const count = await registry.getDIDCount();
    expect(count).to.equal(1);
  });

  it("should reject DID update from non-owner", async function () {
    await registry.registerDID("did:ca:alice", "https://example.com/alice.json");
    await expect(
      registry.connect(addr1).updateDID("did:ca:alice", "https://example.com/hacked.json")
    ).to.be.revertedWith("Not the DID owner");
  });

  it("should deactivate a DID", async function () {
    await registry.registerDID("did:ca:alice", "https://example.com/alice.json");
    await registry.deactivateDID("did:ca:alice");
  });

  it("should reject operations on deactivated DID", async function () {
    await registry.registerDID("did:ca:alice", "https://example.com/alice.json");
    await registry.deactivateDID("did:ca:alice");
    await expect(
      registry.updateDID("did:ca:alice", "https://example.com/update.json")
    ).to.be.revertedWith("DID does not exist or is inactive");
  });

  it("should anchor a credential", async function () {
    await registry.anchorCredential(
      "cred-001",
      "did:ca:alice",
      "did:ca:bob",
      "0xabc123"
    );
    const revoked = await registry.isCredentialRevoked("cred-001");
    expect(revoked).to.be.false;
  });

  it("should revoke a credential", async function () {
    await registry.anchorCredential(
      "cred-001",
      "did:ca:alice",
      "did:ca:bob",
      "0xabc123"
    );
    await registry.revokeCredential("cred-001");
    const revoked = await registry.isCredentialRevoked("cred-001");
    expect(revoked).to.be.true;
  });

  it("should reject revoking an already revoked credential", async function () {
    await registry.anchorCredential(
      "cred-001",
      "did:ca:alice",
      "did:ca:bob",
      "0xabc123"
    );
    await registry.revokeCredential("cred-001");
    await expect(
      registry.revokeCredential("cred-001")
    ).to.be.revertedWith("Credential already revoked");
  });

  it("should update reputation score", async function () {
    await reputation.updateReputation("did:ca:alice", 10, 7, 1);
    const s = await reputation.getReputation("did:ca:alice");
    expect(s[0]).to.equal(10); // total
    expect(s[1]).to.equal(7);  // verified
    expect(s[2]).to.equal(1);  // reported
    expect(s[3]).to.equal(63); // score = (7*100)/(10+1)=63
  });
});
