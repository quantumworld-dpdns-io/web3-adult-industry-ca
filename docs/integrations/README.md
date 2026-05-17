# Tool Integrations

These integrations were selectively implemented from the [software-tools](https://github.com/quantumworld-dpdns-io/software-tools) knowledge base.

| Tool | Type | Implementation | Status |
|------|------|---------------|--------|
| [Model Context Protocol (MCP)](https://modelcontextprotocol.io) | Agent Protocol | `integrations/mcp-server/server.py` — 5 MCP tools for AI agents | ✅ |
| [Noir (ZK Proofs)](https://noir-lang.org) | Zero-Knowledge | `integrations/zk-proofs/circuits/age_verification/` — age verification circuit | ✅ |
| [PQC Libraries (liboqs)](https://openquantumsafe.org) | Post-Quantum Crypto | `ca-core/src/crypto_pqc.rs` — hybrid Ed25519+ML-DSA signatures | ✅ |
| [OpenAPI Tool Calling](https://platform.openai.com/docs/actions) | Agent API | `ca-api/` — FastAPI generates OpenAPI 3.1 with AI-friendly schemas | ✅ |
| [OpenTelemetry](https://opentelemetry.io) | Observability | `ca-api/app/telemetry.py`, `otel-collector-config.yaml`, Jaeger tracing | ✅ |

## 1. Model Context Protocol (MCP)

The CA is accessible as an MCP server so AI assistants (Claude, Codex, etc.) can programmatically manage credentials.

**Tools exposed:**
- `issue_credential` — Issue a new Verifiable Credential
- `verify_credential` — Verify a credential's proof
- `check_revocation_status` — Check revocation status
- `resolve_did` — Resolve a Decentralized Identifier
- `get_dashboard_stats` — Get CA statistics

**Usage:**
```bash
cd integrations/mcp-server
pip install -r requirements.txt
python server.py
```

Clients connect via stdio transport. The server can operate standalone (embedded crypto) or proxy to the FastAPI backend.

## 2. Noir Zero-Knowledge Proofs

Privacy-preserving age verification for the adult industry.

**Circuit: `age_verification`**
- Proves a subject is at least N years old without revealing their birthdate
- Private inputs: birth date (year, month, day)
- Public inputs: minimum age, current date
- Uses `nargo test` for circuit verification

**Future work:** membership proofs, selective attribute disclosure, nullifier-based revocation.

## 3. Post-Quantum Cryptography

Future-proof credential signatures against quantum computer threats.

**Approach:** Hybrid signatures — each credential is signed with both Ed25519 (classical) and ML-DSA-65 (NIST FIPS 204). Verifiers can check either or both depending on their security requirements.

**Status:** Feature-gated behind `pqc` feature in `ca-core/Cargo.toml`. Requires liboqs C library to be installed.

## 4. OpenAPI Tool Calling

The FastAPI server auto-generates an OpenAPI 3.1 schema designed for AI agent consumption.

**AI-friendly features:**
- Descriptive `operationId` values (e.g., `issueCredential`, `resolveDid`)
- `x-openai-isConsequential: true` on write operations
- Detailed parameter descriptions and JSON Schema validation
- Proper `summary` and `description` fields
- Auth scheme documented (API key / Bearer JWT)

View the schema at `http://localhost:8000/openapi.json` when the API is running.

## 5. OpenTelemetry Observability

Distributed tracing, metrics, and logging across the CA platform.

**Components:**
- `ca-api/app/telemetry.py` — FastAPI OTLP instrumentation
- `otel-collector-config.yaml` — OTel collector config
- `docker-compose.yml` — Jaeger + OpenTelemetry Collector

**View traces:** Open http://localhost:16686 (Jaeger UI) in development.
