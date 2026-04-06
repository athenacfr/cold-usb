# Cold USB

**Vision:** Air-gapped Bitcoin cold wallet desktop application for secure offline key storage, address derivation, and PSBT transaction signing.
**For:** Bitcoin holders who want hardware-wallet-level security without dedicated hardware.
**Solves:** Secure cold storage on any air-gapped USB-bootable machine — no internet, no attack surface.

## Goals

- Secure offline mnemonic generation, storage, and management (AES-256-GCM + Argon2id)
- BIP32/44/84/86 HD wallet with Native SegWit (P2WPKH) and Taproot (P2TR) address derivation
- PSBT parsing, review, signing, and export via QR codes
- Privacy-first UX: auto-lock, privacy overlay, decorationless fullscreen window

## Tech Stack

**Current (Tauri v2):**

- Framework: Tauri v2 (Rust backend + webview frontend)
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 + Zustand 5
- Backend: Rust (bitcoin 0.32, bip39 2.0, aes-gcm 0.10, argon2 0.5, secp256k1)
- IPC: Tauri `invoke()` command system

**Target (Electrobun + Bun Monorepo):**

- Framework: Electrobun (Bun runtime + system WebView)
- Structure: Bun workspaces monorepo with custom packages
- Frontend: React 19 + Vite + Tailwind CSS 4 + Zustand 5 (unchanged)
- Backend: Bun/TypeScript — custom packages built on bitcoinjs-lib ecosystem
- IPC: Electrobun typed RPC schema
- Multi-chain: Cross-blockchain architecture (chains added incrementally)

## Scope

**v1 includes:**

- Monorepo structure with Bun workspaces and custom packages
- Port Rust crypto/wallet/storage backend to TypeScript using bitcoinjs-lib
- Chain-agnostic architecture (Bitcoin first, ETH later)
- Replace Tauri IPC with Electrobun typed RPC
- Adapt frontend to Electrobun view APIs
- Feature parity with current Tauri app

**Explicitly out of scope:**

- Ethereum/EVM support (deferred to v2)
- Multi-platform packaging/distribution (defer to post-migration)
- Electrobun auto-updater integration

## Constraints

- **Security:** This is a cold wallet. Crypto operations must use audited libraries. No shortcuts on encryption.
- **Electrobun is beta:** v1.17.3-beta.3. API may change. Accept this risk.
- **JS memory safety:** No equivalent to Rust's `zeroize`. Sensitive data in memory is GC-controlled. Document this tradeoff.
- **Wallet file compatibility:** Existing wallet.enc files use bincode serialization. New format will likely differ — need migration path or clean break.
