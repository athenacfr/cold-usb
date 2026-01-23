// Address derivation commands

use tauri::State;
use crate::types::AddressInfo;
use crate::state::WalletState;
use crate::wallet::hd::HDWallet;
use crate::wallet::address::{bip84_path, derive_address_from_key, ScriptType};
use crate::crypto::keys::parse_derivation_path;

#[tauri::command]
pub async fn derive_address(
    account: u32,
    change: u32,
    index: u32,
    state: State<'_, WalletState>,
) -> Result<AddressInfo, String> {
    // Check if wallet is unlocked
    let unlocked = state.get_unlocked()
        .ok_or_else(|| "Wallet is locked".to_string())?;

    let mnemonic = unlocked.mnemonic.clone();
    let network = unlocked.network;

    // Create HD wallet from mnemonic
    let wallet = HDWallet::from_mnemonic(
        &mnemonic,
        None, // Passphrase is stored separately
        network,
    ).map_err(|e| format!("Failed to create wallet: {}", e))?;

    // Generate BIP84 derivation path (Native SegWit)
    let path = bip84_path(account, change, index, network);

    // Derive key at path
    let key = wallet.derive_key_from_path(&path)
        .map_err(|e| format!("Failed to derive key: {}", e))?;

    // Derive address
    let address_info = derive_address_from_key(
        &key,
        ScriptType::NativeSegwit,
        &path,
        network,
    ).map_err(|e| format!("Failed to derive address: {}", e))?;

    state.update_activity();

    Ok(address_info)
}

#[tauri::command]
pub async fn derive_custom_address(
    derivation_path: String,
    state: State<'_, WalletState>,
) -> Result<AddressInfo, String> {
    // Check if wallet is unlocked
    let unlocked = state.get_unlocked()
        .ok_or_else(|| "Wallet is locked".to_string())?;

    let mnemonic = unlocked.mnemonic.clone();
    let network = unlocked.network;

    // Validate derivation path
    parse_derivation_path(&derivation_path)
        .map_err(|e| format!("Invalid derivation path: {}", e))?;

    // Create HD wallet from mnemonic
    let wallet = HDWallet::from_mnemonic(
        &mnemonic,
        None,
        network,
    ).map_err(|e| format!("Failed to create wallet: {}", e))?;

    // Derive key at custom path
    let key = wallet.derive_key_from_path(&derivation_path)
        .map_err(|e| format!("Failed to derive key: {}", e))?;

    // Determine script type from path (default to Native SegWit)
    let script_type = if derivation_path.starts_with("m/86'") || derivation_path.starts_with("86'") {
        ScriptType::Taproot
    } else {
        ScriptType::NativeSegwit
    };

    // Derive address
    let address_info = derive_address_from_key(
        &key,
        script_type,
        &derivation_path,
        network,
    ).map_err(|e| format!("Failed to derive address: {}", e))?;

    state.update_activity();

    Ok(address_info)
}

#[tauri::command]
pub async fn derive_addresses(
    account: u32,
    change: u32,
    start_index: u32,
    count: u32,
    state: State<'_, WalletState>,
) -> Result<Vec<AddressInfo>, String> {
    // Limit count to prevent abuse
    if count > 100 {
        return Err("Count cannot exceed 100".to_string());
    }

    // Check if wallet is unlocked
    let unlocked = state.get_unlocked()
        .ok_or_else(|| "Wallet is locked".to_string())?;

    let mnemonic = unlocked.mnemonic.clone();
    let network = unlocked.network;

    // Create HD wallet from mnemonic
    let wallet = HDWallet::from_mnemonic(
        &mnemonic,
        None,
        network,
    ).map_err(|e| format!("Failed to create wallet: {}", e))?;

    let mut addresses = Vec::new();

    for i in 0..count {
        let index = start_index + i;
        let path = bip84_path(account, change, index, network);

        // Derive key at path
        let key = wallet.derive_key_from_path(&path)
            .map_err(|e| format!("Failed to derive key: {}", e))?;

        // Derive address
        let address_info = derive_address_from_key(
            &key,
            ScriptType::NativeSegwit,
            &path,
            network,
        ).map_err(|e| format!("Failed to derive address: {}", e))?;

        addresses.push(address_info);
    }

    state.update_activity();

    Ok(addresses)
}

#[tauri::command]
pub async fn validate_derivation_path(path: String) -> Result<bool, String> {
    match parse_derivation_path(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
