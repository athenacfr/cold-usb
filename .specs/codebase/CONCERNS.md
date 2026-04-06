# Concerns

## Security

### SEC-1: Memory Safety in JS Migration (High Risk)

**Evidence:** Rust backend uses `zeroize` crate on `UnlockedWallet`, `WalletPayload`, and `EncryptionKey` to clear sensitive data from memory on drop.
**Impact:** JavaScript/TypeScript has no equivalent. Mnemonics and private keys in memory are GC-controlled — no guarantee of timely clearing.
**Fix approach:** Use `Uint8Array` for sensitive data and explicitly `.fill(0)` when done. Document the limitation. Consider Bun FFI to a small C/Zig library for key operations if needed.

### SEC-2: Wallet File Format Change (Medium Risk)

**Evidence:** Current format uses Rust `bincode 2.0` serialization. No JS bincode library exists with full v2 compatibility.
**Impact:** Existing `wallet.enc` files cannot be read by the new TypeScript backend without a migration tool.
**Fix approach:** Either (a) write a one-time Rust migration CLI that re-encrypts to a new format, or (b) accept clean break since the app is pre-release.

### SEC-3: PSBT Signing Correctness (High Risk)

**Evidence:** `wallet/psbt.rs` manually constructs sighash, signs with secp256k1, builds witness. This is complex, security-critical code.
**Impact:** Any deviation in the JS port could produce invalid signatures or, worse, expose private keys.
**Fix approach:** Use `bitcoinjs-lib`'s built-in PSBT class which handles signing internally. Test with known test vectors from BIP174/BIP370.

## Technical Debt

### TD-1: No Frontend Tests

**Evidence:** Zero test files, no test runner in dependencies.
**Impact:** No regression safety net during migration.
**Fix approach:** Add Vitest after migration for critical flows.

### TD-2: get_wallet_info Calls load_wallet with Empty Password

**Evidence:** `commands/wallet.rs:196` — `load_wallet("")` to get metadata.
**Impact:** This always fails decryption. The function relies on error handling to still return created_at, which is fragile.
**Fix approach:** Store non-sensitive metadata (network, fingerprint, created_at) in a separate unencrypted file.

## Architecture

### ARCH-1: Tight Tauri Coupling in Frontend

**Evidence:** 9 files import from `@tauri-apps/api`. Invoke calls are directly in Zustand stores and components.
**Impact:** Every Tauri integration point must be replaced with Electrobun equivalent.
**Fix approach:** Create an abstraction layer (bridge module) that both Tauri and Electrobun can implement, then swap implementations.
