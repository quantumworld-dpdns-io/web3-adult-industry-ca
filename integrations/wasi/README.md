# WASI 0.3 Plugin Runtime

Sandboxed execution of untrusted credential verification logic using Wasmtime with WASI 0.3 preview.

## Architecture

- **Plugin trait** (`runtime/plugin_trait.rs`) — Defines the `CredentialPlugin` interface
- **Plugin host** (`runtime/plugin_host.rs`) — Loads and runs WASM plugins via Wasmtime
- **Example plugin** (`examples/verify_plugin.wat`) — Stub WAT module

## Build & Run

```bash
cd runtime
cargo build --release
./target/release/plugin_host plugin.wasm credential.json
```

## Plugin Interface

Plugins export a `verify` function that takes credential JSON and a public key, returning a boolean validity result.
