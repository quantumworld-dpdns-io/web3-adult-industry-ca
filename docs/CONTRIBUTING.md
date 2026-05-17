# Contributing

## Setup

```bash
git clone https://github.com/quantumworld-dpdns-io/web3-adult-industry-ca.git
cd web3-adult-industry-ca
git checkout dev
cp .env.example .env
```

## Development

Each component has its own development workflow. See README.md for per-component commands.

## Pull Request Process

1. Branch from `dev`, PR to `dev`
2. Ensure CI passes (Rust build+test, Python lint, Robot framework tests)
3. Add or update Robot Framework tests for new functionality
4. Run OWASP security tests if changing authentication or authorization
5. Update documentation (README, OpenAPI schema if API changes)

## Code Style

- **Rust**: `cargo fmt` + `cargo clippy`
- **Python**: `ruff` or `flake8` (E9,F63,F7,F82)
- **TypeScript**: Standard Next.js conventions, no `any` types
- **Solidity**: NATSPEC comments on all public functions
- **Robot Framework**: Descriptive test names, BDD-style

## Commit Messages

```
type(scope): description

feat:    new feature
fix:     bug fix
chore:   maintenance
docs:    documentation
test:    test changes
security: security-related change
```

## Security

Report vulnerabilities by opening a security issue. Do not open public issues for security bugs.
