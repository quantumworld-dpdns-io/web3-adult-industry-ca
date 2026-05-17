# Contributing to Web3 Adult Industry CA

Thank you for your interest in contributing! This document outlines how to get started.

## 📋 Table of Contents
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Reporting Issues](#reporting-issues)

## 🛠️ Development Setup

### Prerequisites
- Rust 1.80+ (`rustup`)
- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- Expo CLI (for mobile development)
- JDK 17+ (for Karate)
- Appium Server (for mobile testing)

### Getting Started
```bash
# 1. Clone the repository
git clone https://github.com/quantumworld-dpdns-io/web3-adult-industry-ca.git
cd web3-adult-industry-ca

# 2. Checkout development branch
git checkout dev

# 3. Copy environment template
cp .env.example .env

# 4. Start all services
docker compose up -d

# 5. Install mobile dependencies
cd ca-mobile
npm install
cd ..

# 6. Seed demo data (optional but recommended)
curl -X POST http://localhost:8000/admin/seed-data \
  -H "X-API-Key: dev-api-key"
```

## 🔧 Making Changes

### Rust Core (`ca-core/`)
```bash
# Build and test
cargo build
cargo test

# Format
cargo fmt

# Lint
cargo clippy -- -D warnings
```

### Python API (`ca-api/`)
```bash
# Install dependencies
cd ca-api
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000

# Lint
flake8 .

# Run tests (if any)
pytest
```

### Next.js Dashboard (`ca-dashboard/`)
```bash
# Install dependencies
cd ca-dashboard
npm install

# Development server
npm run dev

# Production build
npm run build && npm run start

# Lint
npm run lint
```

### Mobile App (`ca-mobile/`)
```bash
# Install dependencies
cd ca-mobile
npm install

# Development
npm start

# Build for production
expo build:android
expo build:ios
```

### Smart Contracts
#### Solana
```bash
cd contracts/solana
anchor build
anchor test
anchor deploy  # to localnet
```

#### EVM
```bash
cd contracts/evm
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

## 🧪 Testing

The project uses **four complementary test frameworks**:

### Behave (BDD - Python)
```bash
cd tests/behave
pip install -r requirements.txt
behave  # or behave -f allure_behave.formatter:AllureBehaveFormatter
```

### Playwright (Browser E2E - TypeScript)
```bash
cd tests/playwright
npm install
npx playwright test
npx playwright show-report  # view HTML report
```

### Karate (API + Security - Java/JS)
```bash
cd tests/karate
./mvnw test  # or ./gradlew test if using Gradle
# For IntelliJ: Run as JUnit test
```

### Appium (Mobile E2E - Python)
```bash
cd tests/appium
pip install -r requirements.txt
# Start Appium server: appium
pytest -v
```

### Running All Tests
```bash
# From repository root:
./scripts/run-all-tests.sh  # if script exists
# Or run each framework individually as shown above
```

## 📤 Pull Request Process

1. **Fork** the repository and clone your fork
2. Create a branch from `dev`: `git checkout -b feature/your-feature-name`
3. Make your changes in small, focused commits
4. Ensure all tests pass for your changes
5. Update documentation if needed
6. Push to your fork and open a Pull Request to `dev`
7. Fill out the PR template completely
8. Address any review comments
9. Once approved, maintainers will merge

### Commit Message Format
```
type(scope): short description

[optional body]

[optional footer(s)]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `security`

**Scope**: The module or component changed (e.g., `vc`, `did`, `api`, `dashboard`, `mobile`, `contracts`)

**Examples**:
- `feat(vc): add support for compliance certificate type`
- `fix(did): resolve did:web with trailing slash`
- `docs(api): update credential issue endpoint examples`
- `test(behave): add BDD scenario for webhook delivery`
- `perf(mojo): optimize batch verification with SIMD`

## 🎨 Code Style Guidelines

### Rust
- Follow [Rust API Guidelines](https://rust-lang-nursery.github.io/api-guidelines/)
- Use `rustfmt` (via `cargo fmt`)
- Use `clippy` for linting (via `cargo clippy`)
- Write unit tests alongside implementation (`#[cfg(test)]` modules)
- Document public APIs with `///` doc comments

### Python (FastAPI)
- Follow [PEP 8](https://pep.python.org/pep-0008/)
- Use type hints (PEP 484) extensively
- Line length: 88 characters (Black default)
- Use `flake8` for linting
- Write docstrings for all public functions and classes
- Use Pydantic v2 for data validation

### TypeScript/React
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with TypeScript overrides
- Use ESLint + Prettier
- Prefer functional components with hooks
- Keep components small and focused
- Write unit tests with Jest/Vitest and React Testing Library
- Use meaningful test descriptions

### Mobile (React Native)
- Follow React Native community best practices
- Use TypeScript strictly
- Keep components reusable and platform-agnostic when possible
- Test on both iOS and Android simulators/devices

### Smart Contracts
- Follow Solidity [Style Guide](https://docs.soliditylang.org/en/v0.8.20/style-guide.html)
- Use NatSpec comments for all public functions
- Write comprehensive test suites
- Use modifiers for access control
- Follow checks-effects-interactions pattern

### Test Frameworks
- **Behave**: Use Gherkin syntax Given/When/Then, write reusable step definitions
- **Playwright**: Use page object model, write descriptive test titles
- **Karate**: Use readable feature tags, leverage built-in assertions
- **Appium**: Use page object model, test on both Android and iOS

## 🐛 Reporting Issues

Before submitting an issue, please check if it has already been reported.

When reporting a bug, include:
- **Clear description** of the problem
- **Steps to reproduce** (minimal if possible)
- **Expected behavior** vs **actual behavior**
- **Screenshots** or logs if applicable
- **Environment**: OS, Rust/Python/Node.js versions, etc.

For security vulnerabilities, please email security@quantumworld-dpdns-io.io directly instead of opening a public issue.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by the quantumworld-dpdns-io team
- Thanks to all open-source projects that make this possible
- Inspired by the decentralized identity and verifiable credentials ecosystem