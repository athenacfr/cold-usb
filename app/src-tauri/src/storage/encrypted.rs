// Encrypted file I/O operations

use std::path::PathBuf;
use std::fs;
use aes_gcm::aead::rand_core::RngCore;
use aes_gcm::aead::OsRng;
use crate::error::WalletError;
use crate::storage::wallet_file::{WalletFile, WalletPayload};
use crate::crypto::encryption::{EncryptionKey, encrypt, decrypt};

/// Get wallet file path
pub fn get_wallet_path() -> Result<PathBuf, WalletError> {
    let data_dir = dirs::data_local_dir()
        .ok_or_else(|| WalletError::StorageError("Could not find local data directory".to_string()))?;

    let app_dir = data_dir.join("cold-usb");

    // Create directory if it doesn't exist
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| WalletError::StorageError(format!("Failed to create app directory: {}", e)))?;
    }

    Ok(app_dir.join("wallet.enc"))
}

/// Check if wallet file exists
pub fn wallet_exists() -> bool {
    get_wallet_path()
        .map(|path| path.exists())
        .unwrap_or(false)
}

/// Delete wallet file
pub fn delete_wallet() -> Result<(), WalletError> {
    let wallet_path = get_wallet_path()?;
    if wallet_path.exists() {
        fs::remove_file(&wallet_path)
            .map_err(|e| WalletError::StorageError(format!("Failed to delete wallet file: {}", e)))?;
    }
    Ok(())
}

/// Save encrypted wallet file
pub fn save_wallet(payload: &WalletPayload, password: &str) -> Result<(), WalletError> {
    // Generate random salt for Argon2
    let mut salt = [0u8; 32];
    OsRng.fill_bytes(&mut salt);

    // Derive encryption key from password
    let key = EncryptionKey::from_password(password, &salt)?;

    // Serialize payload to bytes
    let payload_bytes = bincode::serde::encode_to_vec(payload, bincode::config::standard())
        .map_err(|e| WalletError::SerializationError(format!("Failed to serialize payload: {}", e)))?;

    // Encrypt the payload
    let encrypted = encrypt(&payload_bytes, &key)?;

    // Extract nonce and ciphertext
    let nonce = encrypted[..12].to_vec();
    let ciphertext_with_tag = encrypted[12..].to_vec();

    // Create wallet file structure
    let wallet_file = WalletFile {
        version: WalletFile::VERSION,
        salt: salt.to_vec(),
        nonce,
        encrypted_data: ciphertext_with_tag[..ciphertext_with_tag.len() - 16].to_vec(),
        auth_tag: ciphertext_with_tag[ciphertext_with_tag.len() - 16..].to_vec(),
    };

    // Serialize wallet file
    let file_bytes = bincode::serde::encode_to_vec(&wallet_file, bincode::config::standard())
        .map_err(|e| WalletError::SerializationError(format!("Failed to serialize wallet file: {}", e)))?;

    // Write to disk
    let wallet_path = get_wallet_path()?;
    fs::write(&wallet_path, file_bytes)
        .map_err(|e| WalletError::StorageError(format!("Failed to write wallet file: {}", e)))?;

    Ok(())
}

/// Load encrypted wallet file
pub fn load_wallet(password: &str) -> Result<WalletPayload, WalletError> {
    // Read wallet file from disk
    let wallet_path = get_wallet_path()?;
    if !wallet_path.exists() {
        return Err(WalletError::StorageError("Wallet file not found".to_string()));
    }

    let file_bytes = fs::read(&wallet_path)
        .map_err(|e| WalletError::StorageError(format!("Failed to read wallet file: {}", e)))?;

    // Deserialize wallet file
    let (wallet_file, _): (WalletFile, usize) = bincode::serde::decode_from_slice(&file_bytes, bincode::config::standard())
        .map_err(|e| WalletError::SerializationError(format!("Failed to deserialize wallet file: {}", e)))?;

    // Verify version
    if wallet_file.version != WalletFile::VERSION {
        return Err(WalletError::StorageError(format!(
            "Unsupported wallet version: {} (expected {})",
            wallet_file.version,
            WalletFile::VERSION
        )));
    }

    // Derive encryption key from password and stored salt
    let key = EncryptionKey::from_password(password, &wallet_file.salt)?;

    // Reconstruct encrypted data (nonce + ciphertext + auth_tag)
    let mut encrypted = Vec::with_capacity(12 + wallet_file.encrypted_data.len() + 16);
    encrypted.extend_from_slice(&wallet_file.nonce);
    encrypted.extend_from_slice(&wallet_file.encrypted_data);
    encrypted.extend_from_slice(&wallet_file.auth_tag);

    // Decrypt the payload
    let payload_bytes = decrypt(&encrypted, &key)?;

    // Deserialize payload
    let (payload, _): (WalletPayload, usize) = bincode::serde::decode_from_slice(&payload_bytes, bincode::config::standard())
        .map_err(|e| WalletError::SerializationError(format!("Failed to deserialize payload: {}", e)))?;

    Ok(payload)
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::Network;
    use chrono::Utc;
    use std::fs;

    fn cleanup_test_wallet() {
        if let Ok(path) = get_wallet_path() {
            let _ = fs::remove_file(path);
        }
    }

    #[test]
    fn test_get_wallet_path() {
        let path = get_wallet_path().unwrap();
        assert!(path.to_string_lossy().contains("cold-usb"));
        assert!(path.to_string_lossy().ends_with("wallet.enc"));
    }

    #[test]
    fn test_wallet_exists() {
        cleanup_test_wallet();
        assert!(!wallet_exists());
    }

    #[test]
    fn test_save_and_load_wallet_roundtrip() {
        cleanup_test_wallet();

        // Create test payload
        let payload = WalletPayload {
            mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".to_string(),
            passphrase: None,
            network: Network::Testnet,
            fingerprint: "73c5da0a".to_string(),
            created_at: Utc::now(),
        };

        let password = "test_password_123";

        // Save wallet
        save_wallet(&payload, password).unwrap();
        assert!(wallet_exists());

        // Load wallet
        let loaded = load_wallet(password).unwrap();

        // Verify payload matches
        assert_eq!(loaded.mnemonic, payload.mnemonic);
        assert_eq!(loaded.passphrase, payload.passphrase);
        assert_eq!(loaded.network, payload.network);
        assert_eq!(loaded.fingerprint, payload.fingerprint);

        cleanup_test_wallet();
    }

    #[test]
    fn test_load_with_wrong_password() {
        cleanup_test_wallet();

        let payload = WalletPayload {
            mnemonic: "test mnemonic phrase here".to_string(),
            passphrase: None,
            network: Network::Bitcoin,
            fingerprint: "12345678".to_string(),
            created_at: Utc::now(),
        };

        let correct_password = "correct_password";
        let wrong_password = "wrong_password";

        // Save with correct password
        save_wallet(&payload, correct_password).unwrap();

        // Try to load with wrong password
        let result = load_wallet(wrong_password);
        assert!(result.is_err());

        cleanup_test_wallet();
    }

    #[test]
    fn test_load_nonexistent_wallet() {
        cleanup_test_wallet();

        let result = load_wallet("any_password");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), WalletError::StorageError(_)));
    }

    #[test]
    fn test_save_with_passphrase() {
        cleanup_test_wallet();

        let payload = WalletPayload {
            mnemonic: "test mnemonic with passphrase".to_string(),
            passphrase: Some("my_secret_passphrase".to_string()),
            network: Network::Bitcoin,
            fingerprint: "abcdef12".to_string(),
            created_at: Utc::now(),
        };

        let password = "encryption_password";

        // Save and load
        save_wallet(&payload, password).unwrap();
        let loaded = load_wallet(password).unwrap();

        // Verify passphrase is preserved
        assert_eq!(loaded.passphrase, Some("my_secret_passphrase".to_string()));

        cleanup_test_wallet();
    }

    #[test]
    fn test_deterministic_encryption() {
        cleanup_test_wallet();

        let payload = WalletPayload {
            mnemonic: "deterministic test".to_string(),
            passphrase: None,
            network: Network::Testnet,
            fingerprint: "11111111".to_string(),
            created_at: Utc::now(),
        };

        let password = "test_password";

        // Save wallet
        save_wallet(&payload, password).unwrap();
        let path = get_wallet_path().unwrap();
        let first_save = fs::read(&path).unwrap();

        // Save again with same data and password
        save_wallet(&payload, password).unwrap();
        let second_save = fs::read(&path).unwrap();

        // Files should be different (due to random salt and nonce)
        assert_ne!(first_save, second_save);

        // But both should decrypt to same payload
        let loaded = load_wallet(password).unwrap();
        assert_eq!(loaded.mnemonic, payload.mnemonic);

        cleanup_test_wallet();
    }
}
