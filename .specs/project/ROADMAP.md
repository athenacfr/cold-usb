# Roadmap

## M1: Electrobun Migration (Current)

Monorepo restructure + port from Tauri v2 (Rust) to Electrobun (Bun/TypeScript). Bitcoin first, chain-agnostic architecture.

### Features

| ID | Feature | Scope | Status |
|----|---------|-------|--------|
| F1 | Monorepo scaffold + packages skeleton | Medium | Pending |
| F2 | @coldusb/crypto — encryption package | Medium | Pending |
| F3 | @coldusb/wallet-core — chain-agnostic interfaces | Small | Pending |
| F4 | @coldusb/wallet-bitcoin — Bitcoin implementation | Large | Pending |
| F5 | @coldusb/storage — encrypted file I/O | Medium | Pending |
| F6 | Electrobun app shell + typed RPC | Large | Pending |
| F7 | Frontend adaptation (Tauri → Electrobun) | Medium | Pending |
| F8 | Integration testing + verification | Medium | Pending |
| F9 | Tauri/Rust removal + cleanup | Small | Pending |

### Dependencies

```
F1 (scaffold) ──→ F2 (crypto) ──→ F5 (storage) ──→ F6 (app shell + RPC)
     │              │                                      │
     └──→ F3 (core interfaces) ──→ F4 (bitcoin) ──────────┘
                                                           │
                                              F7 (frontend) ──→ F8 (testing) ──→ F9 (cleanup)
```

## M2: Ethereum Support (Future)

- @coldusb/wallet-ethereum package (ethers.js / viem)
- Multi-chain UI (chain selector, per-chain address derivation)
- EVM transaction signing

## M3: Post-Migration Polish (Future)

- Electrobun auto-updater integration
- Multi-platform packaging (macOS, Linux, Windows)
- Frontend test suite (Vitest)
- Enhanced QR chunking for large PSBTs
