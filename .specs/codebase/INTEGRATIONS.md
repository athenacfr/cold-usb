# External Integrations

## System APIs

### Tauri Window API

**Purpose:** Native window controls (close, minimize, maximize, focus detection)
**Implementation:** Frontend imports from `@tauri-apps/api/window`
**Used in:** `CloseButton.tsx`, `TopBar.tsx`, `useWindowFocus.ts`

### Tauri Core API

**Purpose:** IPC between frontend and Rust backend
**Implementation:** `invoke()` from `@tauri-apps/api/core`
**Used in:** `walletStore.ts`, `Settings.tsx`, `SigningFlow.tsx`, `UnlockWallet.tsx`, `CreateWallet.tsx`, `AddressManager.tsx`

### Tauri Plugin: Opener

**Purpose:** Open external URLs/files
**Implementation:** `tauri-plugin-opener` (Rust side)

### File System

**Purpose:** Encrypted wallet storage
**Implementation:** `dirs::data_local_dir()` → `cold-usb/wallet.enc`
**Format:** bincode-serialized WalletFile { version, salt, nonce, encrypted_data, auth_tag }

## Camera

### QR Scanner

**Purpose:** Scan QR codes from camera feed
**Implementation:** `qr-scanner` library (browser MediaDevices API)
**Used in:** QR scanning components

## No External Network Services

This is a cold wallet — by design, there are zero network/API integrations. All operations are fully offline.
