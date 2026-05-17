# Age Verification Circuit

Zero-knowledge proof circuit that proves a person is above a minimum age threshold without revealing their exact birthdate.

## What It Proves

Given:
- **Private input:** `birth_date` (year, month, day) — known only to the prover
- **Public inputs:** `minimum_age` (e.g. 18 or 21), `current_date` (year, month, day)

The circuit proves that `age_in_days >= minimum_age * 365` without disclosing the actual birth date.

## Usage

### Prerequisites

Install [Noir](https://noir-lang.org) version >= 0.36.0:

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

### Prove

```bash
cd circuits/age_verification
nargo execute age_proof
```

The proof is written to `./proofs/age_proof.proof` and the public inputs to `./proofs/age_proof.public`.

### Verify

```bash
nargo verify age_proof
```

### Generate Solidity Verifier

```bash
nargo codegen-verifier
```

Outputs a Solidity contract that can verify this proof on-chain.

## Integration with CA Core

The generated proof can be attached to a Verifiable Credential as supplemental evidence. The CA Rust backend reads proofs via the `zk.rs` interface and includes the verification result in the credential metadata.

## Circuit Details

- Age is approximated using a day-count formula: `(year_diff * 365) + (month_diff * 30) + (day_diff)`
- The circuit constrains all date fields to valid ranges (months 1-12, days 1-31)
- The birth year is constrained to be no later than the current year
- For production use, a more precise month-length calculation should be used; this circuit prioritises simplicity and clarity
