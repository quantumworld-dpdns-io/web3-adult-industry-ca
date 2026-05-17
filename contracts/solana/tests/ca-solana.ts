import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CaSolana } from "../target/types/ca_solana";
import { assert } from "chai";

describe("ca-solana", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CaSolana as Program<CaSolana>;
  const authority = provider.wallet.publicKey;

  const testDid = "did:ca:testuser123";
  const testDocumentUri = "https://example.com/did/testuser123";
  const testCredentialId = "cred-001";
  const testIssuerDid = "did:ca:issuer001";
  const testSubjectDid = "did:ca:subject001";
  const credentialHash = new Uint8Array(32).fill(42);

  it("Registers a DID", async () => {
    const [didRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did_registry"), Buffer.from(testDid)],
      program.programId
    );

    await program.methods
      .registerDid(testDid, testDocumentUri)
      .accounts({
        didRegistry: didRegistryPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const registry = await program.account.didRegistry.fetch(didRegistryPda);
    assert.equal(registry.did, testDid);
    assert.equal(registry.owner.toString(), authority.toString());
    assert.equal(registry.documentUri, testDocumentUri);
    assert.isTrue(registry.active);
  });

  it("Deactivates a DID", async () => {
    const [didRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did_registry"), Buffer.from(testDid)],
      program.programId
    );

    await program.methods
      .deactivateDid()
      .accounts({
        didRegistry: didRegistryPda,
        authority,
      })
      .rpc();

    const registry = await program.account.didRegistry.fetch(didRegistryPda);
    assert.isFalse(registry.active);
  });

  it("Anchors a credential", async () => {
    const [credentialPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(testCredentialId)],
      program.programId
    );

    const [issuerRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did_registry"), Buffer.from(testIssuerDid)],
      program.programId
    );

    await program.methods
      .registerDid(testIssuerDid, "https://issuer.example.com/did")
      .accounts({
        didRegistry: issuerRegistryPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .anchorCredential(
        testCredentialId,
        testIssuerDid,
        testSubjectDid,
        credentialHash
      )
      .accounts({
        issuerRegistry: issuerRegistryPda,
        credentialRecord: credentialPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.credentialRecord.fetch(credentialPda);
    assert.equal(record.credentialId, testCredentialId);
    assert.equal(record.issuerDid, testIssuerDid);
    assert.equal(record.subjectDid, testSubjectDid);
    assert.isFalse(record.revoked);
  });

  it("Revokes a credential", async () => {
    const [credentialPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(testCredentialId)],
      program.programId
    );

    const [issuerRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did_registry"), Buffer.from(testIssuerDid)],
      program.programId
    );

    const reason = "Content policy violation";

    await program.methods
      .revokeCredential(testCredentialId, reason)
      .accounts({
        credentialRecord: credentialPda,
        issuerDidRegistry: issuerRegistryPda,
        authority,
      })
      .rpc();

    const record = await program.account.credentialRecord.fetch(credentialPda);
    assert.isTrue(record.revoked);
    assert.equal(record.revocationReason, reason);
  });

  it("Updates reputation score", async () => {
    const subjectDid = "did:ca:creator456";
    const [reputationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), Buffer.from(subjectDid)],
      program.programId
    );

    await program.methods
      .updateReputation(subjectDid, true, false)
      .accounts({
        reputationScore: reputationPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const reputation = await program.account.reputationScore.fetch(reputationPda);
    assert.equal(reputation.subjectDid, subjectDid);
    assert.equal(reputation.totalCredentials.toNumber(), 1);
    assert.equal(reputation.verifiedCredentials.toNumber(), 1);
    assert.equal(reputation.reportedInstances.toNumber(), 0);
    assert.isAbove(reputation.score.toNumber(), 0);
  });
});
