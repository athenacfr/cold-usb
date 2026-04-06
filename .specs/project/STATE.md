# State

## Current Phase

- **Active:** Brownfield mapping + migration specification
- **Next:** Feature specification for Tauri → Electrobun migration

## Decisions

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| D1 | Migrate from Tauri v2 to Electrobun + Bun | User-initiated. Bun runtime, smaller bundles, typed RPC. | 2026-04-06 |
| D2 | Accept Electrobun beta status | Project is not yet in production distribution | 2026-04-06 |
| D3 | Use bitcoinjs-lib (not @scure or wallet-core) | User preference. Mature, widely adopted, reference PSBT implementation. | 2026-04-06 |
| D4 | Monorepo with custom packages | Build own packages as needed. Bun workspaces. | 2026-04-06 |
| D5 | Cross-blockchain support | Architecture must be chain-agnostic. Chains added incrementally. | 2026-04-06 |

## Blockers

None currently.

## Lessons

_(Empty — first session)_

## Todos

- [ ] Determine wallet file format migration strategy (bincode → msgpack/JSON)
- [ ] Verify bitcoinjs-lib PSBT signing produces identical results to Rust bitcoin crate
- [ ] Test Electrobun system WebView CSP compatibility with current app
- [ ] Decide on ECC library for bitcoinjs-lib (tiny-secp256k1 WASM vs @noble/secp256k1 via @bitcoinerlab/secp256k1)
- [ ] Define which blockchains beyond Bitcoin to support (awaiting user input)
- [ ] Design chain-agnostic wallet interface for multi-chain packages

## Deferred Ideas

_(None yet)_

## Preferences

_(None yet)_
