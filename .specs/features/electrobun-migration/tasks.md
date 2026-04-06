# Electrobun Migration Tasks

**Design**: `.specs/features/electrobun-migration/design.md`
**Status**: In Progress

---

## Execution Plan

### Phase 1: Monorepo Scaffold (Sequential)

```
T1 → T2 → T3 → T4
```

### Phase 2: Core Packages (Parallel OK after T4)

```
     ┌→ T5 (crypto) ────────┐
T4 ──┼→ T6 (wallet-core) ───┼→ T9 (storage)
     └→ T7 (wallet-bitcoin) ─┘
          └→ T8 (wallet-bitcoin PSBT)
```

### Phase 3: Desktop App (Sequential)

```
T9 → T10 (electrobun shell) → T11 (RPC schema) → T12 (RPC handlers) → T13 (frontend adapt)
```

### Phase 4: Cleanup (Sequential)

```
T13 → T14 (remove tauri) → T15 (verify)
```

---

## Task Breakdown

### T1: Initialize monorepo root with Bun workspaces

**What**: Create root `package.json` with workspace config, `bunfig.toml`, shared `tsconfig.json`
**Where**: `cold-usb/package.json`, `cold-usb/bunfig.toml`, `cold-usb/tsconfig.base.json`
**Depends on**: None
**Requirement**: MIG-00a, MIG-00d

**Done when**:
- [ ] Root `package.json` defines `workspaces: ["packages/*", "apps/*"]`
- [ ] `bunfig.toml` exists
- [ ] `tsconfig.base.json` with shared compiler options
- [ ] `bun install` succeeds from root

**Commit**: `build(monorepo): initialize bun workspace root`

---

### T2: Scaffold package directories

**What**: Create empty package skeletons for `crypto`, `wallet-core`, `wallet-bitcoin`, `storage`
**Where**: `packages/*/package.json`, `packages/*/tsconfig.json`, `packages/*/src/index.ts`
**Depends on**: T1
**Requirement**: MIG-00b

**Done when**:
- [ ] Each package has `package.json` with name `@coldusb/<name>`
- [ ] Each package has `tsconfig.json` extending base
- [ ] Each package has `src/index.ts` with placeholder export
- [ ] `bun install` resolves workspace packages

**Commit**: `build(monorepo): scaffold package skeletons`

---

### T3: Scaffold desktop app directory

**What**: Create `apps/desktop/` with Electrobun config, package.json, Vite config, and directory structure
**Where**: `apps/desktop/`
**Depends on**: T1
**Requirement**: MIG-00c, MIG-09

**Done when**:
- [ ] `electrobun.config.ts` with app name "Cold USB", identifier, version
- [ ] `package.json` with electrobun, react, vite, tailwind dependencies
- [ ] `vite.config.ts` for React + Tailwind (no Tauri config)
- [ ] `src/bun/index.ts` placeholder
- [ ] `src/mainview/index.html` placeholder
- [ ] Directory structure matches Electrobun conventions

**Commit**: `build(desktop): scaffold electrobun app`

---

### T4: Install all dependencies and verify workspace resolution

**What**: Run `bun install`, verify cross-package imports work, remove old `pnpm-lock.yaml`
**Where**: Root
**Depends on**: T2, T3
**Requirement**: MIG-00a, MIG-00b, MIG-00e

**Done when**:
- [ ] `bun install` creates `bun.lock` at root
- [ ] `pnpm-lock.yaml` deleted
- [ ] Importing `@coldusb/crypto` from `@coldusb/storage` resolves
- [ ] `bun run build` in any package succeeds (even if just placeholder)

**Commit**: `build(monorepo): install deps and verify workspace resolution`

---

### T5: Implement @coldusb/crypto package

**What**: Port AES-256-GCM encryption + Argon2id key derivation from Rust to TypeScript
**Where**: `packages/crypto/src/`
**Depends on**: T4
**Reuses**: `src-tauri/src/crypto/encryption.rs` (port logic)
**Requirement**: MIG-07, MIG-08

**Done when**:
- [ ] `deriveKey(password, salt)` produces 32-byte key via Argon2id (time=3, mem=64MB, parallel=4)
- [ ] `encrypt(data, key)` returns nonce(12) + ciphertext + tag(16)
- [ ] `decrypt(data, key)` recovers plaintext
- [ ] `decrypt` with wrong key throws error
- [ ] `generateSalt()` returns 32 random bytes
- [ ] Exported from package index

**Verify**: `bun test packages/crypto/`

**Commit**: `feat(crypto): implement AES-256-GCM encryption with Argon2id key derivation`

---

### T6: Implement @coldusb/wallet-core interfaces

**What**: Define chain-agnostic TypeScript interfaces and shared types
**Where**: `packages/wallet-core/src/`
**Depends on**: T4
**Reuses**: `src-tauri/src/types.rs` (type definitions)
**Requirement**: MIG-12 (types)

**Done when**:
- [ ] `ChainWallet` interface (generateMnemonic, validateMnemonic, fromMnemonic)
- [ ] `WalletInstance` interface (fingerprint, deriveAddress, deriveAddresses)
- [ ] `TransactionSigner` interface (parsePSBT, signPSBT)
- [ ] Shared types: `WalletInfo`, `AddressInfo`, `PSBTDetails`, `PSBTInput`, `PSBTOutput`, `SignedPSBTResult`, `TransactionDetails`, `TxInput`, `TxOutput`
- [ ] `WalletPayload` type for storage
- [ ] All exported from package index

**Commit**: `feat(wallet-core): define chain-agnostic wallet interfaces and types`

---

### T7: Implement @coldusb/wallet-bitcoin — mnemonic + HD + addresses

**What**: Port BIP39 mnemonic, BIP32 HD wallet, BIP84/86 address derivation using bitcoinjs-lib
**Where**: `packages/wallet-bitcoin/src/`
**Depends on**: T6
**Reuses**: `src-tauri/src/crypto/mnemonic.rs`, `crypto/keys.rs`, `wallet/hd.rs`, `wallet/address.rs`
**Requirement**: MIG-01, MIG-02, MIG-03, MIG-04

**Done when**:
- [ ] `generateMnemonic(12|24)` returns valid BIP39 mnemonic
- [ ] `validateMnemonic(mnemonic)` returns boolean
- [ ] `getWordlist()` returns 2048 English words
- [ ] `BitcoinWallet.fromMnemonic(mnemonic, passphrase?, network?)` creates wallet instance
- [ ] `wallet.fingerprint()` returns hex master fingerprint matching Rust output for "abandon...about"
- [ ] `wallet.deriveAddress("m/84'/0'/0'/0/0")` returns P2WPKH address matching Rust
- [ ] `wallet.deriveAddress("m/86'/0'/0'/0/0")` returns P2TR address matching Rust
- [ ] `deriveBIP84Address(account, change, index)` helper
- [ ] `deriveBIP86Address(account, change, index)` helper
- [ ] `deriveAddresses(account, change, startIndex, count)` batch derivation
- [ ] `validateDerivationPath(path)` returns boolean
- [ ] Implements `ChainWallet` and `WalletInstance` from wallet-core

**Verify**: `bun test packages/wallet-bitcoin/` — test with "abandon...about" mnemonic

**Commit**: `feat(wallet-bitcoin): implement mnemonic, HD wallet, and address derivation`

---

### T8: Implement @coldusb/wallet-bitcoin — PSBT parsing + signing

**What**: Port PSBT parse, sign, finalize using bitcoinjs-lib Psbt class
**Where**: `packages/wallet-bitcoin/src/psbt.ts`
**Depends on**: T7
**Reuses**: `src-tauri/src/wallet/psbt.rs`, `src-tauri/src/commands/transaction.rs`
**Requirement**: MIG-05, MIG-06

**Done when**:
- [ ] `parsePSBT(data, format)` decodes base64/hex, extracts inputs, outputs, fee, feeRate, totals
- [ ] `signPSBT(data, format, wallet)` signs matching inputs, finalizes P2WPKH, returns SignedPSBTResult
- [ ] `getTransactionDetails(data, format)` extracts txid, version, locktime, size, vsize, weight, inputs, outputs
- [ ] Returns error for invalid PSBT data
- [ ] Returns error when no inputs match wallet fingerprint
- [ ] Implements `TransactionSigner` from wallet-core

**Verify**: `bun test packages/wallet-bitcoin/`

**Commit**: `feat(wallet-bitcoin): implement PSBT parsing, signing, and finalization`

---

### T9: Implement @coldusb/storage package

**What**: Port encrypted wallet file I/O using msgpackr + @coldusb/crypto
**Where**: `packages/storage/src/`
**Depends on**: T5, T6
**Reuses**: `src-tauri/src/storage/encrypted.rs`, `src-tauri/src/storage/wallet_file.rs`
**Requirement**: MIG-21, MIG-22, MIG-23

**Done when**:
- [ ] `saveWallet(payload, password)` serializes with msgpackr, encrypts, writes to `~/.local/share/cold-usb/wallet.enc`
- [ ] `loadWallet(password)` reads, decrypts, deserializes back to WalletPayload
- [ ] `walletExists()` returns boolean
- [ ] `deleteWallet()` removes file
- [ ] `getWalletPath()` returns platform-appropriate path
- [ ] Wrong password throws clear error
- [ ] Version check rejects mismatched versions

**Verify**: `bun test packages/storage/`

**Commit**: `feat(storage): implement encrypted wallet file I/O with msgpackr`

---

### T10: Implement Electrobun app shell

**What**: Set up BrowserWindow with correct properties, Vite build integration, views:// serving
**Where**: `apps/desktop/src/bun/index.ts`, `apps/desktop/electrobun.config.ts`
**Depends on**: T3
**Requirement**: MIG-09, MIG-10, MIG-11

**Done when**:
- [ ] `electrobun.config.ts` has `build.copy` mapping `dist/` → `views/mainview/`
- [ ] `src/bun/index.ts` creates maximized, decorationless, always-on-top BrowserWindow
- [ ] Window loads `views://mainview/index.html`
- [ ] Dev mode detects Vite dev server and loads `http://localhost:5173` instead
- [ ] Close button closes the app
- [ ] `package.json` scripts: `dev`, `dev:hmr`, `build:canary`

**Verify**: `cd apps/desktop && bun run dev` launches window

**Commit**: `feat(desktop): implement electrobun app shell with browser window`

---

### T11: Define typed RPC schema

**What**: Create Electrobun RPC type definitions for all 22 commands
**Where**: `apps/desktop/src/shared/rpc.ts`
**Depends on**: T6
**Requirement**: MIG-12, MIG-13, MIG-14, MIG-15, MIG-16

**Done when**:
- [ ] `ColdUSBRPC` type with all 22 request definitions (12 wallet, 4 address, 3 transaction, 3 QR)
- [ ] Each request has typed `params` and `response`
- [ ] Importable from both `src/bun/` and `src/mainview/`

**Commit**: `feat(desktop): define typed RPC schema for all 22 commands`

---

### T12: Implement RPC handlers in Bun main process

**What**: Wire RPC handlers to @coldusb packages, implement in-memory wallet state
**Where**: `apps/desktop/src/bun/rpc.ts`, `apps/desktop/src/bun/state.ts`
**Depends on**: T5, T7, T8, T9, T10, T11
**Requirement**: MIG-12, MIG-13, MIG-14, MIG-15, MIG-16

**Done when**:
- [ ] `state.ts`: WalletState class with unlock/lock/getUnlocked/isUnlocked/updateActivity
- [ ] `rpc.ts`: All 22 handlers implemented, calling @coldusb packages
- [ ] Wallet handlers: create, import, unlock, lock, exists, getInfo, exportMnemonic, validateMnemonic, getWordlist, generateMnemonic, delete, changePassword
- [ ] Address handlers: derive, deriveCustom, deriveAddresses, validatePath
- [ ] Transaction handlers: parsePsbt, signPsbt, getTransactionDetails
- [ ] QR handlers: generateQr, generateQrCompressed, decodeCompressedQr
- [ ] Errors propagate as strings (matching current Tauri behavior)

**Commit**: `feat(desktop): implement all RPC handlers with wallet state management`

---

### T13: Adapt frontend from Tauri to Electrobun RPC

**What**: Move React app to `apps/desktop/src/mainview/`, replace all `@tauri-apps` imports
**Where**: `apps/desktop/src/mainview/`
**Depends on**: T11, T12
**Reuses**: All existing `app/src/` components (move + adapt)
**Requirement**: MIG-17, MIG-18, MIG-19, MIG-20

**Done when**:
- [ ] All components moved from `app/src/` to `apps/desktop/src/mainview/`
- [ ] `walletStore.ts`: all `invoke()` calls replaced with `rpc.request.X()`
- [ ] `Settings.tsx`: `invoke('change_password')` → RPC
- [ ] `SigningFlow.tsx`: `invoke()` calls → RPC
- [ ] `CreateWallet.tsx`, `UnlockWallet.tsx`, `AddressManager.tsx`: `invoke()` → RPC
- [ ] `CloseButton.tsx`, `TopBar.tsx`: `getCurrentWindow()` → Electrobun window API
- [ ] `useWindowFocus.ts`: Tauri window events → Electrobun equivalent
- [ ] Zero `@tauri-apps` imports remain
- [ ] App runs end-to-end via `bun run dev:hmr`

**Commit**: `feat(desktop): migrate frontend from tauri to electrobun rpc`

---

### T14: Remove Tauri/Rust code and old app structure

**What**: Delete `app/src-tauri/`, old `app/package.json`, `pnpm-lock.yaml`, Tauri configs
**Where**: `app/` directory
**Depends on**: T13
**Requirement**: MIG-00e

**Done when**:
- [ ] `app/src-tauri/` deleted
- [ ] Old `app/package.json` deleted (replaced by `apps/desktop/package.json`)
- [ ] Old `app/vite.config.ts` deleted (replaced by `apps/desktop/vite.config.ts`)
- [ ] Old `app/tsconfig.json` deleted
- [ ] No Rust/Cargo files remain in repo
- [ ] Old root `pnpm-lock.yaml` deleted

**Commit**: `chore(migration): remove tauri and rust code`

---

### T15: End-to-end verification

**What**: Verify all success criteria from spec
**Where**: Full app
**Depends on**: T14

**Done when**:
- [ ] `bun install` from root succeeds
- [ ] `cd apps/desktop && bun run dev` launches the app
- [ ] Create wallet → derive addresses → sign PSBT → lock → unlock → change password → delete — all work
- [ ] "abandon...about" mnemonic produces correct addresses
- [ ] Zero `@tauri-apps` imports
- [ ] Zero Rust code

**Commit**: None (verification only)

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 → T2 → T3 → T4

Phase 2 (Parallel):
  T4 complete, then:
    ├── T5 [P] (crypto)
    ├── T6 [P] (wallet-core)
    └── T7 [P] (wallet-bitcoin mnemonic+HD+addr)
            └── T8 (wallet-bitcoin PSBT)
  T5 + T6 complete → T9 (storage)

Phase 3 (Sequential):
  T10 (app shell, can start after T3)
  T9 + T10 complete → T11 (RPC schema)
  T11 → T12 (RPC handlers, needs T5+T7+T8+T9)
  T12 → T13 (frontend adapt)

Phase 4 (Sequential):
  T13 → T14 (remove tauri) → T15 (verify)
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: Root workspace config | 3 files | OK |
| T2: Package skeletons | 4 packages, boilerplate | OK |
| T3: Desktop app skeleton | 1 app scaffold | OK |
| T4: Install + verify | 1 command + cleanup | OK |
| T5: Crypto package | 1 module (encrypt/decrypt/derive) | OK |
| T6: Wallet-core interfaces | Types only | OK |
| T7: Bitcoin mnemonic+HD+addr | 1 package, core logic | OK (largest, but cohesive) |
| T8: Bitcoin PSBT | 1 file addition | OK |
| T9: Storage package | 1 module (save/load/exists/delete) | OK |
| T10: Electrobun shell | 1 entry point + config | OK |
| T11: RPC schema | 1 type file | OK |
| T12: RPC handlers + state | 2 files | OK |
| T13: Frontend migration | Move + adapt 9 files | OK (mechanical) |
| T14: Remove old code | Delete only | OK |
| T15: E2E verify | Testing only | OK |
