# Cold USB

A bootable USB image for air-gapped cold wallet storage. Boots directly into a minimal Debian environment running a secure wallet application in kiosk mode.

## Overview

Cold USB creates a self-contained bootable disk image that:

- Boots a minimal Debian (Bookworm) system with GRUB bootloader
- Runs a Wayland compositor (Cage) in kiosk mode
- Launches a fullscreen Tauri-based wallet application
- Operates completely offline for secure key management
- Automatically removes network drivers during build for enhanced security
- Uses semantic versioning with automated releases

## Features

### Security

- **Air-gapped operation**: All network drivers (ethernet, WiFi, Bluetooth) are removed during image creation
- **Minimal attack surface**: Only essential system packages are included
- **Automatic login**: Boots directly to the wallet application without manual intervention
- **Kiosk mode**: Application runs in isolated Cage compositor with no access to underlying system

### Build System

- **mkosi-based**: Uses systemd's mkosi for reproducible image builds
- **Automated CI/CD**: GitHub Actions pipeline builds and releases images automatically
- **Semantic versioning**: Automatic version management based on conventional commits
- **Checksums**: SHA256 checksums generated for every release

## Project Structure

```
cold-usb/
├── wallet/                    # Tauri wallet application (React + Rust)
│   ├── src/                   # React frontend source
│   └── src-tauri/             # Rust backend source
├── mkosi/                     # Image build configuration
│   ├── mkosi.conf             # mkosi configuration
│   ├── mkosi.extra/           # Extra files copied to image
│   └── mkosi.postinst.d/      # Post-install scripts
├── .github/workflows/         # CI/CD pipeline
│   └── build-release.yaml     # Automated build and release
├── .releaserc.json            # Semantic-release configuration
└── package.json               # Release tooling dependencies
```

## Requirements

### Development

- Node.js (LTS)
- pnpm v10+
- Rust toolchain (stable)
- System dependencies:
  - `libwebkit2gtk-4.1-dev`
  - `libappindicator3-dev`
  - `librsvg2-dev`
  - `patchelf`

### Building Images

- mkosi v26+
- Python 3.11+ with `pefile` package
- `mtools` for disk image manipulation

## Building

### Build Wallet Binary

```bash
cd wallet
pnpm install
pnpm tauri build
```

The compiled binary will be at `wallet/src-tauri/target/release/app`.

### Build Bootable Image

From the repository root:

```bash
cd mkosi
mkosi build --force
```

The generated disk image and checksums will be in `mkosi/build/`:

- `cold_usb.img` - Bootable disk image
- `cold_usb.SHA256SUMS` - Checksums file

### Using the Image

Write the image to a USB drive:

```bash
# WARNING: This will erase all data on the target device
sudo dd if=mkosi/build/cold_usb.img of=/dev/sdX bs=4M status=progress
sync
```

Replace `/dev/sdX` with your USB drive device (verify with `lsblk`).

## CI/CD Pipeline

The project uses GitHub Actions for automated builds and releases:

1. **Build Wallet**: Compiles the Tauri application
2. **Build Image**: Creates bootable disk image with mkosi
3. **Release**: Uses semantic-release to create GitHub releases with artifacts

Releases are triggered automatically on push to `main` branch when commits follow [conventional commit](https://www.conventionalcommits.org/) format.

## Development

### Wallet Application

The wallet is a Tauri application with:

- **Frontend**: React 19 with TypeScript and Vite
- **Backend**: Rust with Tauri v2

To run in development mode:

```bash
cd wallet
pnpm install
pnpm tauri dev
```

### Testing the Image

After building, test the image in a VM (requires QEMU):

```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 2G \
  -drive file=mkosi/build/cold_usb.img,format=raw \
  -boot c
```

## License

MIT
