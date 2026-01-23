// Cold USB Bitcoin Wallet
// A secure, offline Bitcoin cold wallet

// Module declarations
mod commands;
mod crypto;
mod wallet;
mod storage;
mod state;
mod error;
mod types;

use state::WalletState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(WalletState::new())
        .invoke_handler(tauri::generate_handler![
            // Wallet management
            commands::create_wallet,
            commands::import_wallet,
            commands::unlock_wallet,
            commands::lock_wallet,
            commands::wallet_exists,
            commands::get_wallet_info,
            commands::export_mnemonic,
            commands::validate_mnemonic,
            commands::get_bip39_wordlist,
            commands::generate_mnemonic_cmd,
            commands::delete_wallet,
            commands::change_password,

            // Address operations
            commands::derive_address,
            commands::derive_custom_address,
            commands::derive_addresses,
            commands::validate_derivation_path,

            // Transaction operations
            commands::parse_psbt,
            commands::sign_psbt,
            commands::get_transaction_details,

            // QR utilities
            commands::generate_qr,
            commands::generate_qr_compressed,
            commands::decode_compressed_qr,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
