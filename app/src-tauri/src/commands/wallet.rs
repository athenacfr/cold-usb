// Wallet management commands

use bitcoin::Network;
use chrono::Utc;
use tauri::State;

use crate::types::WalletInfo;
use crate::state::WalletState;
use crate::crypto::mnemonic::{generate_mnemonic, validate_mnemonic as validate_mnemonic_internal, get_wordlist};
use crate::wallet::hd::HDWallet;
use crate::storage::wallet_file::WalletPayload;
use crate::storage::encrypted::{save_wallet, load_wallet, wallet_exists as check_wallet_exists, delete_wallet as delete_wallet_file};

/// Parse network string to Network enum
fn parse_network(network: &str) -> Result<Network, String> {
    match network.to_lowercase().as_str() {
        "bitcoin" | "mainnet" => Ok(Network::Bitcoin),
        "testnet" => Ok(Network::Testnet),
        "regtest" => Ok(Network::Regtest),
        "signet" => Ok(Network::Signet),
        _ => Err(format!("Invalid network: {}", network)),
    }
}

/// Convert Network to string
fn network_to_string(network: Network) -> String {
    match network {
        Network::Bitcoin => "bitcoin".to_string(),
        Network::Testnet => "testnet".to_string(),
        Network::Regtest => "regtest".to_string(),
        Network::Signet => "signet".to_string(),
        _ => "bitcoin".to_string(),
    }
}

#[tauri::command]
pub async fn create_wallet(
    word_count: u8,
    passphrase: Option<String>,
    password: String,
    network: String,
    state: State<'_, WalletState>,
) -> Result<WalletInfo, String> {
    // Validate word count
    if word_count != 12 && word_count != 24 {
        return Err("Word count must be 12 or 24".to_string());
    }

    // Parse network
    let network_enum = parse_network(&network)?;

    // Generate mnemonic
    let mnemonic = generate_mnemonic(word_count)
        .map_err(|e| format!("Failed to generate mnemonic: {}", e))?;

    // Create HD wallet to get fingerprint
    let wallet = HDWallet::from_mnemonic(
        &mnemonic,
        passphrase.as_deref(),
        network_enum,
    ).map_err(|e| format!("Failed to create wallet: {}", e))?;

    let fingerprint = wallet.fingerprint();
    let created_at = Utc::now();

    // Create payload
    let payload = WalletPayload {
        mnemonic: mnemonic.clone(),
        passphrase: passphrase.clone(),
        network: network_enum,
        fingerprint: fingerprint.clone(),
        created_at,
    };

    // Save encrypted wallet
    save_wallet(&payload, &password)
        .map_err(|e| format!("Failed to save wallet: {}", e))?;

    // Unlock wallet in state
    state.unlock(mnemonic.clone(), network_enum, fingerprint.clone());
    state.update_activity();

    Ok(WalletInfo {
        network,
        fingerprint,
        created_at,
        is_locked: false,
    })
}

#[tauri::command]
pub async fn import_wallet(
    mnemonic: String,
    passphrase: Option<String>,
    password: String,
    network: String,
    state: State<'_, WalletState>,
) -> Result<WalletInfo, String> {
    // Validate mnemonic
    let is_valid = validate_mnemonic_internal(&mnemonic)
        .map_err(|e| format!("Failed to validate mnemonic: {}", e))?;

    if !is_valid {
        return Err("Invalid mnemonic phrase".to_string());
    }

    // Parse network
    let network_enum = parse_network(&network)?;

    // Create HD wallet to get fingerprint
    let wallet = HDWallet::from_mnemonic(
        &mnemonic,
        passphrase.as_deref(),
        network_enum,
    ).map_err(|e| format!("Failed to create wallet: {}", e))?;

    let fingerprint = wallet.fingerprint();
    let created_at = Utc::now();

    // Create payload
    let payload = WalletPayload {
        mnemonic: mnemonic.clone(),
        passphrase: passphrase.clone(),
        network: network_enum,
        fingerprint: fingerprint.clone(),
        created_at,
    };

    // Save encrypted wallet
    save_wallet(&payload, &password)
        .map_err(|e| format!("Failed to save wallet: {}", e))?;

    // Unlock wallet in state
    state.unlock(mnemonic.clone(), network_enum, fingerprint.clone());
    state.update_activity();

    Ok(WalletInfo {
        network,
        fingerprint,
        created_at,
        is_locked: false,
    })
}

#[tauri::command]
pub async fn unlock_wallet(
    password: String,
    state: State<'_, WalletState>,
) -> Result<WalletInfo, String> {
    // Load wallet from disk
    let payload = load_wallet(&password)
        .map_err(|e| format!("Failed to unlock wallet: {}", e))?;

    // Clone data before moving
    let network = payload.network;
    let fingerprint = payload.fingerprint.clone();
    let created_at = payload.created_at;
    let mnemonic = payload.mnemonic.clone();

    // Unlock wallet in state
    state.unlock(mnemonic, network, fingerprint.clone());
    state.update_activity();

    Ok(WalletInfo {
        network: network_to_string(network),
        fingerprint,
        created_at,
        is_locked: false,
    })
}

#[tauri::command]
pub async fn lock_wallet(state: State<'_, WalletState>) -> Result<(), String> {
    state.lock();
    Ok(())
}

#[tauri::command]
pub async fn wallet_exists() -> Result<bool, String> {
    Ok(check_wallet_exists())
}

#[tauri::command]
pub async fn get_wallet_info(state: State<'_, WalletState>) -> Result<WalletInfo, String> {
    if !state.is_unlocked() {
        return Err("Wallet is locked".to_string());
    }

    let unlocked = state.get_unlocked()
        .ok_or_else(|| "Wallet is locked".to_string())?;

    let network = unlocked.network;
    let fingerprint = unlocked.fingerprint.clone();

    // Load payload to get created_at
    let payload = load_wallet("")
        .map_err(|_| "Failed to load wallet metadata")?;

    let created_at = payload.created_at;

    Ok(WalletInfo {
        network: network_to_string(network),
        fingerprint,
        created_at,
        is_locked: false,
    })
}

#[tauri::command]
pub async fn export_mnemonic(
    password: String,
    state: State<'_, WalletState>,
) -> Result<String, String> {
    // Verify wallet is unlocked
    if !state.is_unlocked() {
        return Err("Wallet is locked".to_string());
    }

    // Verify password by loading wallet
    let payload = load_wallet(&password)
        .map_err(|e| format!("Invalid password: {}", e))?;

    let mnemonic = payload.mnemonic.clone();

    state.update_activity();

    Ok(mnemonic)
}

#[tauri::command]
pub async fn validate_mnemonic(mnemonic: String) -> Result<bool, String> {
    validate_mnemonic_internal(&mnemonic)
        .map_err(|e| format!("Failed to validate mnemonic: {}", e))
}

#[tauri::command]
pub async fn get_bip39_wordlist() -> Result<Vec<String>, String> {
    Ok(get_wordlist())
}

#[tauri::command]
pub async fn generate_mnemonic_cmd(word_count: u8) -> Result<String, String> {
    generate_mnemonic(word_count)
        .map_err(|e| format!("Failed to generate mnemonic: {}", e))
}

#[tauri::command]
pub async fn delete_wallet(state: State<'_, WalletState>) -> Result<(), String> {
    // Lock the wallet first to clear sensitive data from memory
    state.lock();

    // Delete the wallet file
    delete_wallet_file()
        .map_err(|e| format!("Failed to delete wallet: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn change_password(
    old_password: String,
    new_password: String,
    state: State<'_, WalletState>,
) -> Result<(), String> {
    // Verify wallet is unlocked
    if !state.is_unlocked() {
        return Err("Wallet is locked".to_string());
    }

    // Load wallet with old password to verify it
    let payload = load_wallet(&old_password)
        .map_err(|_| "Invalid current password".to_string())?;

    // Save wallet with new password
    save_wallet(&payload, &new_password)
        .map_err(|e| format!("Failed to save wallet with new password: {}", e))?;

    state.update_activity();

    Ok(())
}
