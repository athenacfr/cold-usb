# Electrobun Migration Specification

## Problem Statement

The app currently uses Tauri v2 with a Rust backend. We're migrating to Electrobun (Bun runtime + system WebView) to eliminate the Rust toolchain dependency, use a single language (TypeScript) across the stack, and benefit from Bun's performance and developer experience. The Rust crypto backend must be faithfully ported to TypeScript using audited libraries.

## Goals

- [ ] Complete runtime migration from Tauri/Rust to Electrobun/Bun with zero feature regression
- [ ] All crypto operations (mnemonic, HD wallet, addresses, PSBT signing, encryption) produce identical results to the Rust implementation
- [ ] App launches and operates identically from the user's perspective

## Out of Scope

| Feature | Reason |
|---------|--------|
| New wallet features | Migration only — feature parity, not enhancement |
| Backward-compatible wallet.enc reading | bincode v2 has no JS equivalent; clean break acceptable (pre-release) |
| Multi-platform packaging | Defer to post-migration milestone |
| Auto-updater | Defer to post-migration milestone |
| Frontend test suite | Defer to post-migration milestone |

---

## User Stories

### P1: Bun Monorepo Migration ⭐ MVP

**User Story**: As a developer, I want the entire project running on Bun with a monorepo workspace structure so that Node/pnpm is eliminated and packages are properly organized.

**Why P1**: Everything builds on this — no packages, no app, no migration.

**Acceptance Criteria**:

1. WHEN cloning the repo and running `bun install` THEN system SHALL install all workspace dependencies from a single root `bun.lock`
2. WHEN the monorepo root defines workspaces THEN system SHALL resolve `packages/*` and `apps/*` as Bun workspaces
3. WHEN a package imports another workspace package (e.g., `@coldusb/crypto`) THEN Bun SHALL resolve it via workspace protocol without publishing
4. WHEN running `bun run dev` in `apps/desktop` THEN Vite SHALL start on Bun runtime (not Node)
5. WHEN running `bun run build` in any package THEN TypeScript SHALL compile using shared `tsconfig.json` base
6. WHEN `pnpm-lock.yaml` is removed THEN system SHALL have no remaining Node/pnpm artifacts

**Independent Test**: `bun install` from root succeeds, `bun run dev` in apps/desktop starts Vite, cross-package imports resolve.

---

### P1: Crypto Backend in TypeScript ⭐ MVP

**User Story**: As a developer, I want the Bitcoin crypto operations running in Bun/TypeScript so that the Rust backend is no longer required.

**Why P1**: Everything else depends on this — it's the foundation.

**Acceptance Criteria**:

1. WHEN generating a 12 or 24-word mnemonic THEN system SHALL produce a valid BIP39 mnemonic using `bip39` (bitcoinjs ecosystem)
2. WHEN deriving an HD wallet from mnemonic + optional passphrase THEN system SHALL produce the same master fingerprint as the Rust implementation for identical inputs
3. WHEN deriving a BIP84 address (P2WPKH) at path m/84'/0'/0'/0/0 THEN system SHALL produce the same address as the Rust implementation
4. WHEN deriving a BIP86 address (P2TR/Taproot) at path m/86'/0'/0'/0/0 THEN system SHALL produce the same address as the Rust implementation
5. WHEN parsing a PSBT (base64 or hex) THEN system SHALL extract inputs, outputs, fee, and fee rate matching the Rust implementation
6. WHEN signing a PSBT with matching BIP32 derivation paths THEN system SHALL produce valid signatures and finalize P2WPKH inputs
7. WHEN encrypting wallet data with password THEN system SHALL use Argon2id key derivation + AES-256-GCM, producing a file that can be decrypted with the same password
8. WHEN decrypting with wrong password THEN system SHALL fail with an authentication error

**Independent Test**: Run Rust and TypeScript implementations side-by-side with the test mnemonic "abandon...about" and compare all derived addresses, fingerprints, and signed PSBT outputs.

---

### P1: Electrobun App Shell ⭐ MVP

**User Story**: As a user, I want the app to launch in Electrobun with the same fullscreen, decorationless window so that the experience is unchanged.

**Why P1**: Without the app shell, nothing runs.

**Acceptance Criteria**:

1. WHEN running `bunx electrobun dev` THEN system SHALL launch a maximized, decorationless, always-on-top window titled "Cold USB"
2. WHEN the React app loads in the webview THEN system SHALL serve the Vite-built frontend via the `views://` protocol
3. WHEN the user clicks close THEN system SHALL close the application window

**Independent Test**: `bunx electrobun dev` launches the app with correct window properties.

---

### P1: Typed RPC Bridge ⭐ MVP

**User Story**: As a developer, I want all Tauri `invoke()` calls replaced with Electrobun typed RPC so that the frontend communicates with the Bun backend.

**Why P1**: Frontend cannot function without backend communication.

**Acceptance Criteria**:

1. WHEN the frontend calls any wallet operation (create, import, unlock, lock, delete, export mnemonic, validate mnemonic, get wordlist, change password, check exists, get info) THEN system SHALL execute it via typed RPC request/response with full TypeScript types
2. WHEN the frontend calls address operations (derive, derive custom, derive batch, validate path) THEN system SHALL return typed AddressInfo responses via RPC
3. WHEN the frontend calls transaction operations (parse PSBT, sign PSBT, get details) THEN system SHALL return typed results via RPC
4. WHEN the frontend calls QR operations (generate, generate compressed, decode compressed) THEN system SHALL return results via RPC
5. WHEN any RPC handler throws an error THEN system SHALL propagate a typed error string to the frontend (matching current Tauri error behavior)

**Independent Test**: Each RPC endpoint can be called from the webview DevTools console and returns the expected type.

---

### P1: Frontend Adaptation ⭐ MVP

**User Story**: As a user, I want all existing UI features to work identically after migration so that nothing is lost.

**Why P1**: User-facing feature parity is the definition of done.

**Acceptance Criteria**:

1. WHEN `@tauri-apps/api/core` `invoke()` was used THEN system SHALL use Electrobun RPC `rpc.request()` instead
2. WHEN `@tauri-apps/api/window` `getCurrentWindow()` was used THEN system SHALL use Electrobun `BrowserWindow` API instead
3. WHEN the wallet store calls backend operations THEN system SHALL use a bridge module that abstracts the RPC call
4. WHEN privacy overlay, auto-lock, and window focus hooks trigger THEN system SHALL behave identically to current Tauri implementation

**Independent Test**: Walk through all user flows (create wallet → derive address → sign PSBT → lock → unlock → change password → delete) and verify identical behavior.

---

### P2: Encrypted Storage with New Format

**User Story**: As a user, I want my wallet saved to disk with the same security (Argon2id + AES-256-GCM) in a new serialization format.

**Why P2**: Current bincode format has no JS equivalent. New format needed, but core crypto is P1.

**Acceptance Criteria**:

1. WHEN saving a wallet THEN system SHALL serialize payload as MessagePack (or CBOR), encrypt with AES-256-GCM using Argon2id-derived key, and write to `cold-usb/wallet.enc`
2. WHEN loading a wallet THEN system SHALL read, decrypt, and deserialize, restoring all fields (mnemonic, passphrase, network, fingerprint, created_at)
3. WHEN the file version doesn't match THEN system SHALL reject with a clear error

**Independent Test**: Save wallet → restart app → unlock with same password → verify all data intact.

---

### P2: QR Generation in TypeScript

**User Story**: As a user, I want QR code generation to work without the Rust backend so that I can export addresses and signed PSBTs.

**Why P2**: QR display already works via `qrcode.react` on frontend. Backend QR generation (PNG) is used for compressed QR — less critical.

**Acceptance Criteria**:

1. WHEN generating a QR code THEN system SHALL return a base64 PNG data URL
2. WHEN compressing large data for QR THEN system SHALL gzip-compress, prefix with "C:", and base64 encode
3. WHEN decoding compressed QR data THEN system SHALL detect "C:" prefix, decompress, and return original string

**Independent Test**: Generate compressed QR → decode → verify roundtrip.

---

## Edge Cases

- WHEN Electrobun system WebView doesn't support a CSS feature used by Tailwind THEN system SHALL degrade gracefully (test on WebKitGTK for Linux)
- WHEN the wallet file is corrupted THEN system SHALL report "Failed to read wallet file" (not crash)
- WHEN PSBT has no inputs matching our wallet fingerprint THEN system SHALL return "No inputs could be signed with this wallet"
- WHEN Argon2id key derivation takes >5s on slow hardware THEN system SHALL not timeout (no RPC timeout shorter than 30s for crypto operations)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| MIG-00a | P1: Bun Monorepo — bun install + workspaces | Specify | Pending |
| MIG-00b | P1: Bun Monorepo — cross-package resolution | Specify | Pending |
| MIG-00c | P1: Bun Monorepo — Vite on Bun | Specify | Pending |
| MIG-00d | P1: Bun Monorepo — shared tsconfig | Specify | Pending |
| MIG-00e | P1: Bun Monorepo — remove pnpm artifacts | Specify | Pending |
| MIG-01 | P1: Crypto Backend — BIP39 mnemonic | Specify | Pending |
| MIG-02 | P1: Crypto Backend — HD wallet + fingerprint | Specify | Pending |
| MIG-03 | P1: Crypto Backend — BIP84 P2WPKH addresses | Specify | Pending |
| MIG-04 | P1: Crypto Backend — BIP86 P2TR addresses | Specify | Pending |
| MIG-05 | P1: Crypto Backend — PSBT parse | Specify | Pending |
| MIG-06 | P1: Crypto Backend — PSBT sign + finalize | Specify | Pending |
| MIG-07 | P1: Crypto Backend — AES-256-GCM + Argon2id encryption | Specify | Pending |
| MIG-08 | P1: Crypto Backend — Decryption failure handling | Specify | Pending |
| MIG-09 | P1: App Shell — Electrobun window config | Specify | Pending |
| MIG-10 | P1: App Shell — Views protocol serving | Specify | Pending |
| MIG-11 | P1: App Shell — Window close | Specify | Pending |
| MIG-12 | P1: RPC Bridge — Wallet operations (12 commands) | Specify | Pending |
| MIG-13 | P1: RPC Bridge — Address operations (4 commands) | Specify | Pending |
| MIG-14 | P1: RPC Bridge — Transaction operations (3 commands) | Specify | Pending |
| MIG-15 | P1: RPC Bridge — QR operations (3 commands) | Specify | Pending |
| MIG-16 | P1: RPC Bridge — Error propagation | Specify | Pending |
| MIG-17 | P1: Frontend — Replace invoke() with RPC | Specify | Pending |
| MIG-18 | P1: Frontend — Replace window API | Specify | Pending |
| MIG-19 | P1: Frontend — Bridge module abstraction | Specify | Pending |
| MIG-20 | P1: Frontend — Privacy/auto-lock/focus hooks | Specify | Pending |
| MIG-21 | P2: Storage — New serialization format | Specify | Pending |
| MIG-22 | P2: Storage — Save/load roundtrip | Specify | Pending |
| MIG-23 | P2: Storage — Version check | Specify | Pending |
| MIG-24 | P2: QR — PNG generation in TS | Specify | Pending |
| MIG-25 | P2: QR — Compression roundtrip | Specify | Pending |

**Coverage:** 30 total, 0 mapped to tasks, 30 unmapped

---

## Success Criteria

- [ ] `bunx electrobun dev` launches the app with all features working
- [ ] Test mnemonic "abandon...about" produces identical addresses and fingerprint in both Rust and TypeScript
- [ ] PSBT sign/finalize produces valid transactions
- [ ] Wallet create → lock → unlock → change password → delete cycle works end-to-end
- [ ] No `@tauri-apps` imports remain in the codebase
- [ ] No Rust/Cargo code remains (src-tauri deleted)
