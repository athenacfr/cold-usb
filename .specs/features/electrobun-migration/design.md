# Electrobun Migration Design

**Spec**: `.specs/features/electrobun-migration/spec.md`
**Status**: Draft

---

## Architecture Overview

Monorepo with Bun workspaces. Chain-agnostic core with Bitcoin as first implementation. Electrobun app consumes packages.

```
cold-usb/                          # monorepo root
├── packages/
│   ├── crypto/                    # @coldusb/crypto — encryption (AES-256-GCM, Argon2id)
│   ├── wallet-core/               # @coldusb/wallet-core — chain-agnostic interfaces
│   ├── wallet-bitcoin/            # @coldusb/wallet-bitcoin — Bitcoin impl (bitcoinjs-lib)
│   └── storage/                   # @coldusb/storage — encrypted file I/O
├── apps/
│   └── desktop/                   # Electrobun app (Bun main + React webview)
│       ├── electrobun.config.ts
│       ├── src/
│       │   ├── bun/               # Main process (RPC handlers, state)
│       │   │   ├── index.ts       # Entry point, window setup
│       │   │   ├── rpc.ts         # RPC schema + handlers
│       │   │   └── state.ts       # In-memory wallet state
│       │   └── view/              # Webview (React app, mostly unchanged)
│       │       ├── index.html
│       │       ├── main.tsx
│       │       ├── App.tsx
│       │       ├── components/    # (moved from app/src/components/)
│       │       ├── store/         # (adapted: invoke → rpc)
│       │       ├── hooks/         # (adapted: tauri window → electrobun)
│       │       ├── types/
│       │       └── utils/
│       └── package.json
├── package.json                   # workspace root
├── bunfig.toml                    # Bun config
└── tsconfig.json                  # shared TS config
```

### Data Flow (Post-Migration)

```
┌──────────────────────────────────────┐
│          Electrobun WebView          │
│  React + Zustand + Router            │
│  store/ calls rpc.request(...)       │
│              ↕ Typed RPC             │
├──────────────────────────────────────┤
│        Bun Main Process              │
│  rpc.ts handlers                     │
│    → @coldusb/wallet-bitcoin         │
│    → @coldusb/crypto                 │
│    → @coldusb/storage                │
│  state.ts (in-memory unlocked data)  │
└──────────────────────────────────────┘
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
|-----------|----------|------------|
| React components (34 files) | `app/src/components/` | Move to `apps/desktop/src/view/components/` — nearly unchanged |
| Zustand stores | `app/src/store/` | Adapt: replace `invoke()` with RPC calls |
| Custom hooks | `app/src/hooks/` | Adapt: replace `@tauri-apps/api/window` with Electrobun API |
| Types | `app/src/types/` | Move as-is, extend with chain-agnostic interfaces |
| Tailwind CSS | `app/src/tailwind.css` | Move as-is |
| Vite config | `app/vite.config.ts` | Simplify: remove Tauri-specific config |

### What Gets Rewritten (Rust → TypeScript)

| Rust Module | New Package | Key Library |
|-------------|-------------|-------------|
| `crypto/encryption.rs` | `@coldusb/crypto` | `@noble/ciphers` (AES-256-GCM) + `hash-wasm` (Argon2id) |
| `crypto/mnemonic.rs` | `@coldusb/wallet-bitcoin` | `bip39` (bitcoinjs ecosystem) |
| `crypto/keys.rs` | `@coldusb/wallet-bitcoin` | `bip32` + `tiny-secp256k1` |
| `wallet/hd.rs` | `@coldusb/wallet-bitcoin` | `bip32` + `bitcoinjs-lib` |
| `wallet/address.rs` | `@coldusb/wallet-bitcoin` | `bitcoinjs-lib` (payments.p2wpkh, p2tr) |
| `wallet/psbt.rs` | `@coldusb/wallet-bitcoin` | `bitcoinjs-lib` (Psbt class) |
| `storage/` | `@coldusb/storage` | `msgpackr` + `@coldusb/crypto` |
| `state.rs` | `apps/desktop/src/bun/state.ts` | Plain TypeScript |
| `types.rs` | `@coldusb/wallet-core` | TypeScript interfaces |
| `error.rs` | Distributed across packages | TypeScript error classes |

---

## Packages

### @coldusb/wallet-core

- **Purpose**: Chain-agnostic wallet interfaces. Defines what any blockchain wallet must implement.
- **Location**: `packages/wallet-core/`
- **Interfaces**:
  ```typescript
  interface ChainWallet {
    generateMnemonic(wordCount: 12 | 24): string
    validateMnemonic(mnemonic: string): boolean
    fromMnemonic(mnemonic: string, passphrase?: string, network?: string): WalletInstance
  }

  interface WalletInstance {
    fingerprint(): string
    deriveAddress(path: string): AddressInfo
    deriveAddresses(account: number, change: number, startIndex: number, count: number): AddressInfo[]
  }

  interface TransactionSigner {
    parsePSBT(data: string, format: 'base64' | 'hex'): PSBTDetails
    signPSBT(data: string, format: 'base64' | 'hex'): SignedResult
  }

  // Shared types (AddressInfo, PSBTDetails, etc.)
  ```
- **Dependencies**: None (pure interfaces + types)
- **Reuses**: Type definitions from current `app/src/types/` and `src-tauri/src/types.rs`

### @coldusb/wallet-bitcoin

- **Purpose**: Bitcoin implementation of wallet-core interfaces using bitcoinjs-lib.
- **Location**: `packages/wallet-bitcoin/`
- **Interfaces**:
  ```typescript
  class BitcoinWallet implements ChainWallet, TransactionSigner {
    generateMnemonic(wordCount: 12 | 24): string
    validateMnemonic(mnemonic: string): boolean
    fromMnemonic(mnemonic: string, passphrase?: string, network?: string): BitcoinWalletInstance
    parsePSBT(data: string, format: 'base64' | 'hex'): PSBTDetails
    signPSBT(data: string, format: 'base64' | 'hex', wallet: BitcoinWalletInstance): SignedResult
  }

  class BitcoinWalletInstance implements WalletInstance {
    fingerprint(): string
    deriveAddress(path: string): AddressInfo
    deriveAddresses(account: number, change: number, startIndex: number, count: number): AddressInfo[]
    // Bitcoin-specific
    deriveBIP84Address(account: number, change: number, index: number): AddressInfo
    deriveBIP86Address(account: number, change: number, index: number): AddressInfo
  }
  ```
- **Dependencies**: `bitcoinjs-lib`, `bip39`, `bip32`, `tiny-secp256k1`, `@coldusb/wallet-core`
- **Reuses**: Port of `src-tauri/src/wallet/` and `src-tauri/src/crypto/mnemonic.rs`, `keys.rs`

### @coldusb/crypto

- **Purpose**: Password-based encryption. Chain-agnostic — used by storage layer.
- **Location**: `packages/crypto/`
- **Interfaces**:
  ```typescript
  function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array>  // Argon2id → 32-byte key
  function encrypt(data: Uint8Array, key: Uint8Array): Uint8Array              // AES-256-GCM (nonce + ciphertext + tag)
  function decrypt(data: Uint8Array, key: Uint8Array): Uint8Array              // AES-256-GCM decrypt
  function generateSalt(): Uint8Array                                           // 32-byte random salt
  ```
- **Dependencies**: `hash-wasm` (Argon2id), `@noble/ciphers` (AES-256-GCM)
- **Reuses**: Port of `src-tauri/src/crypto/encryption.rs`

### @coldusb/storage

- **Purpose**: Encrypted wallet file I/O. Serializes wallet payload, encrypts, writes to disk.
- **Location**: `packages/storage/`
- **Interfaces**:
  ```typescript
  function saveWallet(payload: WalletPayload, password: string): Promise<void>
  function loadWallet(password: string): Promise<WalletPayload>
  function walletExists(): boolean
  function deleteWallet(): void
  function getWalletPath(): string
  ```
- **Dependencies**: `@coldusb/crypto`, `msgpackr` (serialization, replaces bincode)
- **Reuses**: Port of `src-tauri/src/storage/`

---

## Data Models

### WalletPayload (encrypted on disk)

```typescript
interface WalletPayload {
  mnemonic: string
  passphrase: string | null
  network: string          // "bitcoin" | "testnet" | "regtest" | "signet"
  fingerprint: string      // hex master fingerprint
  createdAt: string        // ISO 8601
  chain: string            // "bitcoin" (extensible: "ethereum", etc.)
}
```

### WalletFile (on-disk envelope)

```typescript
interface WalletFile {
  version: number          // 2 (new format)
  salt: Uint8Array         // 32 bytes
  nonce: Uint8Array        // 12 bytes
  encryptedData: Uint8Array
  authTag: Uint8Array      // 16 bytes
}
```

### RPC Schema (Electrobun typed RPC)

```typescript
type ColdUSBRPC = {
  bun: RPCSchema<{
    requests: {
      // Wallet
      createWallet: { params: { wordCount: number; passphrase: string | null; password: string; network: string }; response: WalletInfo }
      importWallet: { params: { mnemonic: string; passphrase: string | null; password: string; network: string }; response: WalletInfo }
      unlockWallet: { params: { password: string }; response: WalletInfo }
      lockWallet: { params: {}; response: void }
      walletExists: { params: {}; response: boolean }
      getWalletInfo: { params: {}; response: WalletInfo }
      exportMnemonic: { params: { password: string }; response: string }
      validateMnemonic: { params: { mnemonic: string }; response: boolean }
      getBip39Wordlist: { params: {}; response: string[] }
      generateMnemonic: { params: { wordCount: number }; response: string }
      deleteWallet: { params: {}; response: void }
      changePassword: { params: { oldPassword: string; newPassword: string }; response: void }
      // Address
      deriveAddress: { params: { account: number; change: number; index: number }; response: AddressInfo }
      deriveCustomAddress: { params: { derivationPath: string }; response: AddressInfo }
      deriveAddresses: { params: { account: number; change: number; startIndex: number; count: number }; response: AddressInfo[] }
      validateDerivationPath: { params: { path: string }; response: boolean }
      // Transaction
      parsePsbt: { params: { psbtData: string; format: string }; response: PSBTDetails }
      signPsbt: { params: { psbtData: string; format: string }; response: SignedPSBTResult }
      getTransactionDetails: { params: { psbtData: string; format: string }; response: TransactionDetails }
      // QR
      generateQr: { params: { data: string; size: number }; response: string }
      generateQrCompressed: { params: { data: string; size: number; compress: boolean }; response: string }
      decodeCompressedQr: { params: { data: string }; response: string }
    }
    messages: {}
  }>
  webview: RPCSchema<{
    requests: {}
    messages: {}
  }>
}
```

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
|----------------|----------|-------------|
| Wrong password | `decrypt()` throws `DecryptionError` | "Invalid password" shown in UI |
| Invalid mnemonic | `validateMnemonic()` returns false | Validation message in form |
| PSBT no matching keys | `signPSBT()` throws `SigningError` | "No inputs could be signed with this wallet" |
| Corrupted wallet file | `loadWallet()` throws `StorageError` | "Failed to read wallet file" |
| RPC timeout (Argon2) | Set `maxRequestTime: 30000` in RPC config | Loading spinner continues |

---

## Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Serialization format | MessagePack (`msgpackr`) | Binary, compact, fast, good JS support. Replaces Rust bincode. |
| Argon2id library | `hash-wasm` | Pure WASM, works in Bun, same Argon2id algorithm as Rust argon2 crate |
| AES-256-GCM library | `@noble/ciphers` | Audited by Cure53, pure JS, no native deps |
| ECC for bitcoinjs-lib | `tiny-secp256k1` | Default for bitcoinjs-lib ecosystem. WASM-based, Bun-compatible. |
| QR generation | Keep `qrcode.react` in frontend | Already works. No need to port Rust QR PNG generation — frontend handles display. Backend QR commands become thin wrappers or move to frontend entirely. |
| Monorepo tool | Bun workspaces | Native, zero config, fast. No need for Turborepo/Nx. |
