# Project Structure

**Root:** `/home/ahtwr/iara/coldkey/cold-usb/`

## Directory Tree

```
cold-usb/
├── app/                          # Main application
│   ├── package.json              # Frontend dependencies (pnpm)
│   ├── vite.config.ts            # Vite + React + Tailwind
│   ├── tsconfig.json             # TypeScript config (strict)
│   ├── src/                      # Frontend source
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Root component + routing
│   │   ├── tailwind.css          # Tailwind entry
│   │   ├── components/           # UI components
│   │   │   ├── wallet/           # Wallet CRUD (Create, Import, Unlock, Dashboard, Setup)
│   │   │   ├── address/          # AddressManager
│   │   │   ├── transaction/      # SigningFlow
│   │   │   ├── settings/         # Settings (password change)
│   │   │   ├── common/           # Shared UI (Button, Card, Modal, QR, etc.)
│   │   │   └── layout/           # Layout, TabNav, TopBar
│   │   ├── store/                # Zustand stores (walletStore, uiStore)
│   │   ├── hooks/                # Custom hooks (useAutoLock, useWindowFocus)
│   │   ├── types/                # TypeScript types (wallet.ts, transaction.ts)
│   │   └── utils/                # Utilities (validation.ts)
│   └── src-tauri/                # Rust backend
│       ├── Cargo.toml            # Rust dependencies
│       ├── tauri.conf.json       # Tauri window/build config
│       ├── src/
│       │   ├── main.rs           # Binary entry
│       │   ├── lib.rs            # Tauri builder + command registration
│       │   ├── commands/         # Tauri commands (wallet, address, transaction, qr)
│       │   ├── crypto/           # Encryption, mnemonic, key derivation
│       │   ├── wallet/           # HD wallet, address derivation, PSBT signing
│       │   ├── storage/          # Encrypted file I/O, wallet file format
│       │   ├── state.rs          # In-memory wallet state
│       │   ├── types.rs          # Shared types (WalletInfo, PSBTDetails, etc.)
│       │   └── error.rs          # WalletError enum
│       └── icons/                # App icons
├── mkosi/                        # OS image builder (USB boot)
├── .github/                      # GitHub workflows
├── package.json                  # Root: semantic-release
└── .releaserc.json               # Release configuration
```

## Where Things Live

**Wallet management:** Frontend: `components/wallet/` + `store/walletStore.ts` | Backend: `commands/wallet.rs` + `crypto/` + `storage/`
**Address derivation:** Frontend: `components/address/AddressManager.tsx` | Backend: `commands/address.rs` + `wallet/address.rs`
**Transaction signing:** Frontend: `components/transaction/SigningFlow.tsx` | Backend: `commands/transaction.rs` + `wallet/psbt.rs`
**QR operations:** Frontend: `components/common/QRDisplay.tsx`, `QRScanner.tsx` | Backend: `commands/qr.rs`
**Window controls:** Frontend: `components/common/CloseButton.tsx`, `layout/TopBar.tsx`, `hooks/useWindowFocus.ts`
