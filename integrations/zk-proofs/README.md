# Zero-Knowledge Proofs for Adult Industry CA

This directory contains Noir zero-knowledge proof circuits that enable privacy-preserving verification for the Certification Authority.

## Circuits

| Circuit | Description | Status |
|---------|-------------|--------|
| `age_verification` | Prove age >= threshold without revealing birthdate | Complete |

## How ZK Proofs Integrate with the CA

The CA Rust core (`src/zk.rs`) exposes functions for:

- **`generate_proof(circuit_name, private_inputs, public_inputs)`** — runs `nargo execute` and returns the proof bytes
- **`verify_proof(circuit_name, proof, public_inputs)`** — runs `nargo verify` and returns a boolean
- **`attach_proof_to_credential(credential, proof)`** — embeds the proof in a Verifiable Credential's `evidence` field

When a credential is issued with ZK evidence, the verifier can:

1. Extract the proof from the credential's `evidence` field
2. Run the verification circuit with the public inputs (e.g. minimum age, current date)
3. Confirm the user meets the requirement without ever seeing their private data

## Future Circuits

- **Attribute Disclosure Proof** — selectively disclose fields from a credential (e.g. show "over 18" without showing name)
- **Membership Proof** — prove membership in an approved list (e.g. licensed venues) without revealing which member
- **Accumulator Proof** — batch verify multiple credentials in constant time

## Building

```bash
cd circuits/age_verification
nargo check
nargo compile
```

## Proving/Verifying

```bash
nargo execute <proof_name>
nargo verify <proof_name>
nargo codegen-verifier   # generates Solidity verifier contract
```
