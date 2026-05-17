const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificationRegistry", function () {
  let registry;
  let owner;
  let addr1;
  let addr2;

  const testDID = "did:ca:testuser123";
  const testDocumentURI = "https://example.com/did/testuser123";
  const testCredentialId = "cred-001";
  const testIssuerDID = "did:ca:issuer001";
  const testSubjectDID = "did:ca:subject001";
  const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("credential-data"));

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const CertificationRegistry = await ethers.getContractFactory("CertificationRegistry");
    registry = await CertificationRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("DID Registration", function () {
    it("Should register a new DID", async function () {
      await expect(registry.registerDID(testDID, testDocumentURI))
        .to.emit(registry, "DIDRegistered")
        .withArgs(testDID, owner.address, testDocumentURI);

      expect(await registry.getDIDCount()).to.equal(1);
    });

    it("Should reject empty DID", async function () {
      await expect(
        registry.registerDID("", testDocumentURI)
      ).to.be.revertedWith("DID cannot be empty");
    });

    it("Should reject empty document URI", async function () {
      await expect(
        registry.registerDID(testDID, "")
      ).to.be.revertedWith("Document URI cannot be empty");
    });
  });

  describe("DID Deactivation", function () {
    it("Should deactivate a DID", async function () {
      await registry.registerDID(testDID, testDocumentURI);

      await expect(registry.deactivateDID())
        .to.emit(registry, "DIDDeactivated")
        .withArgs(testDID);
    });

    it("Should reject deactivation of non-existent DID", async function () {
      await expect(
        registry.connect(addr1).deactivateDID()
      ).to.be.revertedWith("DID is not active or does not exist");
    });
  });

  describe("Credential Anchoring", function () {
    beforeEach(async function () {
      await registry.registerDID(testIssuerDID, testDocumentURI);
    });

    it("Should anchor a credential", async function () {
      await expect(
        registry.anchorCredential(
          testCredentialId,
          testIssuerDID,
          testSubjectDID,
          credentialHash
        )
      )
        .to.emit(registry, "CredentialAnchored")
        .withArgs(testCredentialId, testIssuerDID, testSubjectDID, credentialHash);
    });

    it("Should reject anchoring from non-owner", async function () {
      await expect(
        registry.connect(addr1).anchorCredential(
          testCredentialId,
          testIssuerDID,
          testSubjectDID,
          credentialHash
        )
      ).to.be.revertedWith("Caller does not own this DID");
    });

    it("Should reject duplicate credential ID", async function () {
      await registry.anchorCredential(
        testCredentialId,
        testIssuerDID,
        testSubjectDID,
        credentialHash
      );

      await expect(
        registry.anchorCredential(
          testCredentialId,
          testIssuerDID,
          testSubjectDID,
          credentialHash
        )
      ).to.be.revertedWith("Credential ID already exists");
    });
  });

  describe("Credential Revocation", function () {
    beforeEach(async function () {
      await registry.registerDID(testIssuerDID, testDocumentURI);
      await registry.anchorCredential(
        testCredentialId,
        testIssuerDID,
        testSubjectDID,
        credentialHash
      );
    });

    it("Should revoke a credential", async function () {
      const reason = "Policy violation";

      await expect(registry.revokeCredential(testCredentialId, reason))
        .to.emit(registry, "CredentialRevoked")
        .withArgs(testCredentialId, reason);

      expect(await registry.isCredentialRevoked(testCredentialId)).to.equal(true);
    });

    it("Should reject revocation by non-issuer", async function () {
      await expect(
        registry.connect(addr1).revokeCredential(testCredentialId, "Unauthorized")
      ).to.be.revertedWith("Only the issuer can revoke");
    });

    it("Should reject double revocation", async function () {
      await registry.revokeCredential(testCredentialId, "First");

      await expect(
        registry.revokeCredential(testCredentialId, "Second")
      ).to.be.revertedWith("Credential already revoked");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to transfer ownership", async function () {
      await registry.transferOwnership(addr1.address);
      expect(await registry.owner()).to.equal(addr1.address);
    });

    it("Should reject transfer from non-owner", async function () {
      await expect(
        registry.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("Should reject zero address transfer", async function () {
      await expect(
        registry.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });
  });
});
