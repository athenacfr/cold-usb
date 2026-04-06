# Code Conventions

## Naming Conventions

**Files (Frontend):**
PascalCase for components: `CreateWallet.tsx`, `AddressManager.tsx`, `PrivacyOverlay.tsx`
camelCase for stores/hooks/utils: `walletStore.ts`, `useAutoLock.ts`, `validation.ts`

**Files (Backend):**
snake_case: `wallet_file.rs`, `encrypted.rs`, `hd.rs`, `psbt.rs`

**Functions (Frontend):**
camelCase: `checkWalletExists`, `lockWallet`, `exportMnemonic`

**Functions (Backend):**
snake_case: `create_wallet`, `derive_address`, `parse_psbt`, `sign_psbt`

**Types:**
PascalCase in both: `WalletInfo`, `PSBTDetails`, `AddressInfo`, `SignedPSBTResult`

## Code Organization

**Import ordering (Frontend):**
1. React/framework imports
2. Third-party libraries
3. Local components/stores
4. Types
5. Styles

**File structure (Frontend components):**
- Imports → interface/type definitions → component function → export

**Rust modules:**
- `mod.rs` re-exports all public items from submodules
- Tests are inline `#[cfg(test)] mod tests { ... }`

## Type Safety

- Frontend: TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- Backend: Rust with explicit error types via `thiserror`
- Tauri commands return `Result<T, String>` — errors converted to strings at boundary

## Error Handling

**Frontend:** try/catch around `invoke()` calls, errors displayed in UI state
**Backend:** `WalletError` enum with thiserror, converted to `String` at Tauri command boundary via `map_err(|e| format!(...))`

## Comments

- Rust: `///` doc comments on public functions, `//` inline for non-obvious logic
- Frontend: Minimal comments, code is self-documenting
