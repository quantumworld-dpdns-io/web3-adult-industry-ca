# Mojo Integration — Batch Credential Verification

Accelerates batch credential verification on the hot path using Mojo's `@parameter` and SIMD for parallel signature verification.

## Usage

Python calls Mojo via subprocess (`mojo run`) or FFI.

## Install

```bash
modular install mojo
```

## Build

```bash
mojo build verify_credential.mojo
```

## Performance

Mojo compiles to efficient native code, enabling SIMD-accelerated batch Ed25519 signature verification.
