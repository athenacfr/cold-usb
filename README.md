# Cold USB

A bootable USB image for air-gapped cold wallet storage. Boots directly into a minimal Debian environment running a secure wallet application.

## Overview

Cold USB creates a self-contained bootable disk image that:

- Boots a minimal Debian (Bookworm) system
- Runs a Wayland compositor (Weston)
- Launches a fullscreen Tauri-based wallet application
- Operates completely offline for secure key management

## Project Structure

```
cold-usb/
├── wallet/           # Tauri wallet application (React + Rust)
├── mkosi/            # Image build configuration
│   ├── mkosi.conf    # mkosi configuration
│   └── build.bash    # Build script
└── .github/workflows # CI/CD pipeline
```

## Requirements

- Node.js (LTS)
- pnpm
- Rust toolchain

## License

MIT
