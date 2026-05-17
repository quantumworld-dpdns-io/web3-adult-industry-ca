# Architecture

## Overview

The CA platform uses a polyglot architecture:

- **Rust** for core cryptographic operations (DID, VC, signing, revocation) — fast, safe, and auditable
- **Python/FastAPI** for the REST API layer — rapid development, rich OpenAPI support, and the Python MCP ecosystem
- **TypeScript/Next.js** for the admin dashboard — modern UI with server components
- **Solidity/Rust (Anchor)** for smart contracts — on-chain anchoring and reputation

## Data Flow

```
User/Dashboard → FastAPI → Rust Core (via subprocess/CLI) → Response
                    ↓
              DuckDB (analytics/audit)
                    ↓
              Webhook dispatcher → registered URLs
                    ↓
              On-chain anchor → Solana/EVM
```

## Key Modules

### ca-core (Rust)

```
crypto.rs        Ed25519 key generation, signing, verification
crypto_pqc.rs    Post-quantum ML-DSA hybrid signatures (feature-gated)
did.rs           DID document creation/resolution (did:key, did:web)
vc.rs            W3C Verifiable Credential issuance and verification
revocation.rs    Bitmap-based revocation registry
zk.rs            Zero-knowledge proof verification interface
```

### ca-api (Python/FastAPI)

```
routers/
  credentials.py   POST /issue, /verify, /revoke, GET /{id}
  dids.py          POST /create, GET /resolve/{did}
  webhooks.py      CRUD webhook registrations + event dispatch
  admin.py         User management, config, seed data
  analytics.py     SQL queries, dashboard metrics, reports
middleware/
  auth.py          API key + JWT authentication, admin role check
  rate_limit.py    Token bucket rate limiter
services/
  credential_service.py   VC logic (issue, verify, revoke)
  did_service.py          DID creation and resolution
models/
  schemas.py              Pydantic v2 models with JSON Schema descriptions
```

### MCP Server

The MCP server exposes 5 tools for AI agents:
- `issue_credential` — Issue a new Verifiable Credential
- `verify_credential` — Verify a credential's proof
- `check_revocation_status` — Check if credential is revoked
- `resolve_did` — Resolve a DID to its document
- `get_dashboard_stats` — Get CA statistics

## Security

1. **API Authentication** — API key (X-API-Key header) or JWT Bearer token
2. **Role-Based Access** — Admin role required for sensitive operations
3. **Rate Limiting** — Token bucket algorithm, configurable per route
4. **Input Validation** — Pydantic v2 schemas with strict validation
5. **Webhook Signing** — HMAC-SHA256 signature on all webhook payloads
6. **CORS** — Restricted to configured origins
7. **PQC Ready** — Hybrid signature support for quantum resistance

## Testing Strategy

- **Unit tests**: Rust `#[cfg(test)]` modules, Python pytest
- **Functional tests**: Robot Framework RESTinstance against live API
- **Security tests**: Robot Framework OWASP Top 10 API + Web test suites
- **DAST**: OWASP ZAP dynamic scanning in CI/CD
- **Dependency scanning**: cargo-audit + pip-audit in nightly CI
- **SAST**: Semgrep with OWASP Top 10 rules
