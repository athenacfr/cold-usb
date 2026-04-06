# Tech Stack

**Analyzed:** 2026-04-06

## Core

- Framework: Tauri v2 (Rust + WebView)
- Language: Rust 2021 edition (backend), TypeScript ~5.9.3 (frontend)
- Runtime: Tauri (Rust binary spawns system WebView)
- Package manager: pnpm (frontend), cargo (backend)

## Frontend

- UI Framework: React 19.2.3
- Bundler: Vite 7.0.4
- Styling: Tailwind CSS 4.1.18 (via @tailwindcss/vite plugin)
- State Management: Zustand 5.0.2
- Routing: react-router-dom 7.1.2
- Validation: Zod 4.3.6
- Icons: lucide-react 0.562.0
- QR: qrcode.react 4.0.1 (display), qr-scanner 1.4.2 (camera scanning)

## Backend (Rust)

- Bitcoin: bitcoin 0.32 (with serde), bip39 2.0, miniscript 13.0.0
- Crypto: aes-gcm 0.10, argon2 0.5, rand 0.9.2, zeroize 1.8
- QR: qrcode 0.14, rqrr 0.10.0, image 0.25
- Encoding: hex 0.4, base64 0.22, bincode 2.0 (with serde)
- Compression: flate2 1.0
- Error: thiserror 2.0.18, anyhow 1.0
- Utilities: chrono 0.4.43, dirs 6.0.0
- Tauri plugins: tauri-plugin-opener 2.5.3

## Testing

- Unit: Rust `#[cfg(test)]` inline tests (backend only)
- No frontend tests detected

## Development Tools

- TypeScript: ~5.9.3
- Vite HMR with Tauri dev server integration (port 1420)
- Tauri CLI for build/dev
