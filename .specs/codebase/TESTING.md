# Testing Infrastructure

## Test Frameworks

- **Backend:** Rust built-in `#[test]` with `#[cfg(test)]` modules
- **Frontend:** None detected (no test runner, no test files)

## Test Organization

**Backend tests:** Inline in each Rust source file as `mod tests { ... }` blocks
**Coverage:** Not measured

## Testing Patterns

### Backend Unit Tests

Present in:
- `crypto/encryption.rs` — encrypt/decrypt roundtrip, wrong password, key consistency
- `crypto/mnemonic.rs` — 12/24 word generation, validation, seed derivation, wordlist
- `crypto/keys.rs` — master key from seed, child derivation, path parsing, determinism
- `wallet/hd.rs` — HD wallet from mnemonic, passphrase, key derivation, determinism
- `wallet/address.rs` — P2WPKH, P2TR derivation, BIP84/86 paths, deterministic addresses
- `wallet/psbt.rs` — PSBT decoding (invalid data, invalid hex, invalid format, minimal valid)
- `storage/encrypted.rs` — save/load roundtrip, wrong password, nonexistent wallet, passphrase preservation
- `commands/qr.rs` — QR generation, compression, decompression roundtrip

**Pattern:** Each test function tests one behavior. Tests use known test vectors (e.g., "abandon...about" mnemonic). Storage tests clean up after themselves.

### Frontend Tests

**None.** No test files, no test runner in package.json, no testing dependencies.

## Test Execution

```bash
cd app/src-tauri && cargo test
```

## Gaps

- No frontend component/integration tests
- No E2E tests
- PSBT signing tests are minimal (no real testnet transaction tests)
- No CI test pipeline detected
