# Architecture

**Pattern:** Two-process desktop app (Rust main process + WebView renderer)

## High-Level Structure

```
┌─────────────────────────────────┐
│         System WebView          │
│  React 19 + Zustand + Router    │
│  (UI, state, navigation)        │
│         ↕ invoke() IPC          │
├─────────────────────────────────┤
│       Tauri Rust Backend        │
│  commands/ → crypto/ → wallet/  │
│              → storage/         │
│  (all sensitive operations)     │
└─────────────────────────────────┘
```

## Identified Patterns

### Command Pattern (Tauri IPC)

**Location:** `src-tauri/src/commands/`
**Purpose:** Expose Rust functions to frontend via `#[tauri::command]`
**Implementation:** 4 command modules (wallet, address, transaction, qr) re-exported via `mod.rs`. Frontend calls via `invoke('command_name', { args })`.
**Example:** `commands::create_wallet` → generates mnemonic, derives HD wallet, encrypts & saves, returns WalletInfo

### Layered Backend Architecture

**Location:** `src-tauri/src/`
**Purpose:** Separation of concerns in Rust backend
**Implementation:**
- `commands/` — Tauri command handlers (thin, orchestrate lower layers)
- `crypto/` — Pure crypto operations (encryption, mnemonic, key derivation)
- `wallet/` — Bitcoin-specific logic (HD wallet, address derivation, PSBT signing)
- `storage/` — Encrypted file I/O
- `state.rs` — In-memory wallet state (Mutex-wrapped)
- `types.rs` — Shared serializable types
- `error.rs` — Error enum with thiserror

### State Management (Dual)

**Location:** Frontend: `src/store/`, Backend: `src-tauri/src/state.rs`
**Purpose:** Frontend tracks UI state, backend holds sensitive data in memory
**Implementation:**
- Frontend Zustand stores: `walletStore` (wallet info, lock status), `uiStore` (UI state)
- Backend WalletState: Mutex<Option<UnlockedWallet>> holds decrypted mnemonic in memory when unlocked
- Sensitive data (mnemonic, keys) never crosses to frontend — only WalletInfo (network, fingerprint, timestamps)

## Data Flow

### Wallet Unlock Flow

```
User enters password
  → Frontend: invoke('unlock_wallet', { password })
  → Backend: load_wallet(password) — reads wallet.enc, derives Argon2 key, AES-GCM decrypt
  → Backend: state.unlock(mnemonic, network, fingerprint) — stores in memory
  → Frontend: receives WalletInfo { network, fingerprint, created_at, is_locked: false }
  → Zustand: updates walletInfo, isLocked = false
```

### PSBT Signing Flow

```
User provides PSBT (base64/hex)
  → Frontend: invoke('parse_psbt', { psbt_data, format })
  → Backend: decode PSBT, extract inputs/outputs/fee for review
  → Frontend: displays PSBTDetails for user confirmation
  → User confirms → invoke('sign_psbt', { psbt_data, format })
  → Backend: derives HD wallet from in-memory mnemonic, matches BIP32 derivation paths, signs inputs
  → Frontend: receives SignedPSBTResult { signed_psbt, is_finalized, transaction_hex }
```

## Code Organization

**Approach:** Layer-based (commands → domain → infrastructure)
**Frontend:** Feature-based component folders (wallet/, address/, transaction/, settings/, common/, layout/)
**Backend:** Layer-based Rust modules (commands → crypto/wallet → storage)
