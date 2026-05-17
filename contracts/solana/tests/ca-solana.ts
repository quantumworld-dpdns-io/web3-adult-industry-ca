import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CaSolana } from "../target/types/ca_solana";
import { assert } from "chai";

describe("ca-solana", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CaSolana as Program<CaSolana>;
  const owner = provider.wallet.publicKey;

  it("registers a DID", async () => {
    const did = "did:ca:alice";
    const uri = "https://example.com/alice/did.json";
    const [didPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did"), Buffer.from(did)],
      program.programId
    );
    await program.methods
      .registerDid(did, uri)
      .accounts({ didRegistry: didPda, owner })
      .rpc();
    const registry = await program.account.didRegistry.fetch(didPda);
    assert.equal(registry.did, did);
    assert.equal(registry.documentUri, uri);
    assert.isTrue(registry.active);
  });

  it("updates a DID", async () => {
    const did = "did:ca:alice";
    const newUri = "https://example.com/alice/did-v2.json";
    const [didPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did"), Buffer.from(did)],
      program.programId
    );
    await program.methods
      .updateDid(newUri)
      .accounts({ didRegistry: didPda, owner })
      .rpc();
    const registry = await program.account.didRegistry.fetch(didPda);
    assert.equal(registry.documentUri, newUri);
  });

  it("deactivates a DID", async () => {
    const did = "did:ca:alice";
    const [didPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("did"), Buffer.from(did)],
      program.programId
    );
    await program.methods
      .deactivateDid()
      .accounts({ didRegistry: didPda, owner })
      .rpc();
    const registry = await program.account.didRegistry.fetch(didPda);
    assert.isFalse(registry.active);
  });

  it("anchors a credential", async () => {
    const credId = "cred-001";
    const issuerDid = "did:ca:alice";
    const subjectDid = "did:ca:bob";
    const hash = "0xabc123def456";
    const [credPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(credId)],
      program.programId
    );
    await program.methods
      .anchorCredential(credId, issuerDid, subjectDid, hash)
      .accounts({ credentialRecord: credPda, issuer: owner })
      .rpc();
    const record = await program.account.credentialRecord.fetch(credPda);
    assert.equal(record.credentialId, credId);
    assert.equal(record.credentialHash, hash);
    assert.isFalse(record.revoked);
  });

  it("revokes a credential", async () => {
    const credId = "cred-001";
    const [credPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(credId)],
      program.programId
    );
    await program.methods
      .revokeCredential(credId)
      .accounts({ credentialRecord: credPda, issuer: owner })
      .rpc();
    const record = await program.account.credentialRecord.fetch(credPda);
    assert.isTrue(record.revoked);
  });
});
