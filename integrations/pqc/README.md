# Post-Quantum Cryptography Integration

This document describes how the CA uses Post-Quantum Cryptography (PQC) to future-proof credential signatures against quantum adversaries.

## Why PQC for a Certification Authority?

Classical public-key algorithms (Ed25519, ECDSA) will be broken by Shor's algorithm once sufficiently large quantum computers exist. Credentials issued today with classical-only signatures could be forged retroactively. The CA therefore supports **hybrid signatures** that combine:

- **Ed25519** (classical, fast, widely deployed) — provides forward compatibility
- **ML-DSA-65** (FIPS 204, NIST-selected) — provides post-quantum security

Both signatures are included in the credential's `proof` block. A verifier can check either or both.

## Algorithm Choices

| Algorithm | Standard | Security Level | Key Size | Signature Size |
|-----------|----------|----------------|----------|----------------|
| Ed25519 | RFC 8032 | 128-bit classical | 32 bytes | 64 bytes |
| ML-DSA-65 | FIPS 204 | NIST Level 3 (128-bit quantum) | 1,312 bytes | 2,309 bytes |

**Recommendation:** ML-DSA-65 balances security and performance for this use case. ML-DSA-87 (Level 5) is available but produces larger signatures.

## Installation

### Install liboqs from Source

```bash
git clone https://github.com/open-quantum-safe/liboqs.git
cd liboqs
mkdir build && cd build
cmake -DCMAKE_INSTALL_PREFIX=/usr/local ..
cmake --build . --parallel
sudo cmake --install .
```

### Install liboqs Rust Wrapper

The CA uses the `oqs` Rust crate. The crate must be built against the installed liboqs:

```bash
# In the CA project root
cargo build --features pqc
```

### Verify Installation

```bash
cargo test --features pqc --test pqc_integration_test
```

## Configuration

Enable PQC in the CA configuration file (`ca-config.toml` or equivalent):

```toml
[cryptography]
signature_scheme = "hybrid"   # "classical" | "pqc" | "hybrid"
pqc_algorithm = "ML-DSA-65"
```

When `signature_scheme = "hybrid"`, every credential issued contains two proof blocks:

```json
{
  "proof": [
    {
      "type": "Ed25519Signature2020",
      "proofValue": "..."
    },
    {
      "type": "MLDSASignature2020",
      "proofValue": "..."
    }
  ]
}
```

When `signature_scheme = "pqc"`, only the ML-DSA signature is included.

## Migration Guide

### Phase 1: Hybrid — All credentials carry both signatures

- Both Ed25519 and ML-DSA keys are generated at CA startup
- Verifiers check Ed25519 (classical-only verifiers still work)
- PQC-aware verifiers can additionally validate the ML-DSA signature

### Phase 2: PQC-Only — Transition once quantum threat is material

- Ed25519 signing is disabled
- All verifiers must support ML-DSA
- Old hybrid credentials are still verifiable (the Ed25519 signature is preserved in the historical record)

## Rust Integration

The Cargo feature flag `pqc` gates the PQC dependency:

```toml
[dependencies]
oqs = { version = "0.1", optional = true }

[features]
pqc = ["oqs"]
```

The relevant source files:

| File | Purpose |
|------|---------|
| `src/crypto/pqc.rs` | ML-DSA key generation, signing, verification via `oqs` crate |
| `src/crypto/hybrid.rs` | Orchestrates dual-signature creation and verification |
| `src/error.rs` | Error variants for PQC-specific failures |

## Key Storage

PQC private keys are larger than classical keys. The CA stores them in the key store alongside classical keys, keyed by algorithm:

```
keystore/
├── ed25519/
│   └── ca_privkey.pem
└── ml_dsa_65/
    └── ca_privkey.pem
```

## References

- [liboqs](https://github.com/open-quantum-safe/liboqs) — C library for quantum-safe cryptographic algorithms
- [FIPS 204 (ML-DSA)](https://csrc.nist.gov/pubs/fips/204/final) — Module-Lattice-Based Digital Signature Standard
- [OQS Rust Wrapper](https://github.com/open-quantum-safe/liboqs-rust) — Rust bindings for liboqs
- [NIST Post-Quantum Cryptography Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
