# Web3 Adult Industry Certification Authority

Verifiable Credentials (VC) Certification Authority for the adult industry — issues and verifies Verified Adult Creator and Licensed Venue credentials with on-chain anchoring, zero-knowledge privacy, and post-quantum cryptography readiness.

Part of the [quantumworld-dpdns-io](https://github.com/quantumworld-dpdns-io) Wild SaaS & Tech Development initiative.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   AI Agents / MCP Clients                     │
├──────────────────────────────────────────────────────────────┤
│  ca-api (Python/FastAPI)        │  mcp-server (Python/MCP)    │
│  - REST API (OpenAPI 3.1)       │  - 5 MCP tools             │
│  - Admin dashboard backend      │  - issue/verify/revoke     │
│  - Webhooks (HMAC-signed)       │  - resolve DID, stats      │
│  - Analytics (DuckDB)           │                             │
├──────────────────────────────────────────────────────────────┤
│  ca-core (Rust)                 │  Smart Contracts            │
│  - DID resolver (did:key,web)   │  - Solana (Anchor)          │
│  - VC issue/verify (Ed25519)    │  - EVM (Solidity)           │
│  - PQC hybrid signatures        │  - DID registry             │
│  - ZK verification interface    │  - Revocation registry      │
│  - Revocation bitmap            │  - Reputation scoring       │
├──────────────────────────────────────────────────────────────┤
│  ca-dashboard (Next.js 14)      │  Infrastructure             │
│  - Admin panel (shadcn/ui)      │  - Docker Compose           │
│  - Credential management        │  - Kubernetes (Kustomize)   │
│  - Reputation explorer          │  - OpenTelemetry tracing    │
│  - Analytics with recharts      │  - Jaeger visualization     │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core Engine | **Rust** (Ed25519, W3C VC/DID spec) |
| REST API | **Python** (FastAPI, Pydantic v2, OpenAPI 3.1) |
| Dashboard | **TypeScript** (Next.js 14, shadcn/ui, Tailwind, recharts) |
| Smart Contracts | **Solana** (Anchor) + **EVM** (Solidity/Hardhat) |
| AI Integration | **MCP Server** (Python MCP SDK) |
| Privacy | **Noir** (Zero-Knowledge age verification circuits) |
| Crypto Readiness | **PQC** (Hybrid Ed25519 + ML-DSA) |
| Observability | **OpenTelemetry** + **Jaeger** |
| Testing | **Robot Framework** (RESTinstance, OWASP Top 10, ZAP DAST) |
| CI/CD | **GitHub Actions** (3 pipelines) |

## Getting Started

### Prerequisites

- Rust 1.80+ (`rustup`)
- Python 3.11+
- Node.js 20+
- Docker + Docker Compose

### Quick Start

```bash
# 1. Clone and enter
git clone https://github.com/quantumworld-dpdns-io/web3-adult-industry-ca.git
cd web3-adult-industry-ca

# 2. Copy environment config
cp .env.example .env

# 3. Start all services
docker compose up -d

# 4. Seed demo data
curl -X POST http://localhost:8000/admin/seed-data \
  -H "X-API-Key: dev-api-key"

# 5. Open dashboard
open http://localhost:3000
```

### Development

```bash
# Rust core
cargo build
cargo test

# Python API
cd ca-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Dashboard
cd ca-dashboard
npm install
npm run dev

# MCP Server
cd integrations/mcp-server
pip install -r requirements.txt
python server.py
```

## Project Structure

```
├── ca-core/              # Rust core library (DID, VC, crypto, revocation, ZK)
├── ca-cli/               # Rust CLI tool (key generation, DID, VC operations)
├── ca-api/               # Python FastAPI REST API
│   ├── app/routers/      # Endpoints: credentials, dids, webhooks, admin, analytics
│   ├── app/middleware/   # Auth (API key + JWT), rate limiting
│   ├── app/models/       # Pydantic v2 schemas
│   └── app/services/     # Business logic
├── ca-dashboard/         # Next.js 14 admin dashboard
│   └── src/
│       ├── app/          # Pages (creds, dids, webhooks, analytics, admin, reputation)
│       └── components/   # Reusable UI (Sidebar, StatsCard, DataTable, Forms)
├── contracts/
│   ├── solana/           # Solana Anchor program (DID registry, revocation, reputation)
│   └── evm/              # EVM contracts (CertificationRegistry, ReputationScore)
├── integrations/
│   ├── mcp-server/       # MCP server for AI agent integration
│   ├── zk-proofs/        # Noir ZK circuits (age verification)
│   └── pqc/              # Post-quantum crypto documentation
├── tests/
│   └── robot/            # Robot Framework test suites
│       ├── functional/   # API functional tests
│       ├── security/     # OWASP Top 10 security tests + ZAP DAST
│       └── resources/    # Shared test keywords
├── k8s/                  # Kubernetes manifests (Kustomize)
├── .github/workflows/    # CI/CD pipelines
└── docs/                 # Documentation
```

## Features

### Core CA
- **DID Management** — Create and resolve `did:key` and `did:web` identifiers
- **Verifiable Credentials** — Issue, verify, and revoke W3C-compliant VCs
- **Credential Types** — `VerifiedAdultCreator`, `LicensedVenue`, `ComplianceCertificate`
- **Revocation** — Bitmap-based revocation registry
- **PQC Ready** — Hybrid Ed25519 + ML-DSA signatures (feature-gated)

### API Platform
- **REST API** — OpenAPI 3.1 with AI-friendly operation IDs
- **Webhooks** — HMAC-signed event delivery (credential.issued, .revoked, etc.)
- **Analytics** — DuckDB-powered SQL queries and dashboard metrics
- **Authentication** — API key + JWT with role-based access control
- **Rate Limiting** — Configurable token-bucket rate limiter

### Smart Contracts
- **Solana (Anchor)** — DID registration, credential anchoring, reputation scoring
- **EVM (Solidity)** — Certification registry with revocation oracle, reputation leaderboard

### AI Integration
- **MCP Server** — 5 tools for AI agents: issue/verify/revoke credentials, resolve DIDs, stats
- **OpenAPI Tool Calling** — API designed for AI consumption (descriptive operationIds, schemas)

### Privacy & Security
- **Zero-Knowledge Proofs** — Age verification circuit in Noir (prove 18+ without revealing birthdate)
- **OWASP Top 10 Protection** — API and web security test suite
- **DAST Scanning** — OWASP ZAP integration in CI/CD
- **Dependency Scanning** — Automated `cargo audit` + `pip-audit`

### Observability
- **OpenTelemetry** — Traces, metrics, logs exported via OTLP
- **Jaeger** — Distributed tracing visualization
- **Structured Logging** — All services log to stdout in structured format

## Testing

```bash
# Rust unit tests
cargo test

# Robot Framework functional tests
pip install -r tests/robot/requirements.txt
robot --variable API_URL:http://localhost:8000 tests/robot/functional/

# Robot Framework OWASP security tests
robot tests/robot/security/owasp_api_security.robot
robot tests/robot/security/owasp_web_security.robot

# DAST scan with ZAP
bash tests/robot/security/dast/run_dast.sh

# Dependency vulnerability scan
pip-audit --requirement ca-api/requirements.txt
cargo audit
```

## CI/CD Pipelines

| Pipeline | Trigger | Coverage |
|----------|---------|----------|
| **CI** | Push/PR to `main` | Rust build+test, Python lint, Robot functional tests, contract validation |
| **Security Scan** | Push/PR + nightly | Dependency audit, Semgrep SAST, ZAP DAST, OWASP Robot tests |
| **Deploy** | Push to `main` (manual) | Docker build → Staging deploy → Smoke tests → Production blue-green |

## Smart Contract Deployment

### Solana
```bash
cd contracts/solana
anchor build
anchor deploy
anchor test
```

### EVM
```bash
cd contracts/evm
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

## Dashboard Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard overview with stats cards, charts, quick actions |
| `/credentials` | Credential lifecycle management (issue, verify, revoke) |
| `/dids` | DID creation and resolution |
| `/webhooks` | Webhook configuration and testing |
| `/analytics` | SQL analytics and pre-built reports |
| `/reputation` | Creator/venue reputation explorer and leaderboard |
| `/admin` | User management, config, seed data |

## License

MIT — see [LICENSE](./LICENSE).
