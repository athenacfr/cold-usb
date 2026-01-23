// AES-256-GCM encryption with Argon2id key derivation

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use aes_gcm::aead::rand_core::RngCore;
use argon2::{Argon2, Algorithm, Version, Params};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::WalletError;

/// Argon2id parameters for key derivation
pub struct Argon2Params {
    pub time_cost: u32,
    pub memory_cost: u32,
    pub parallelism: u32,
}

impl Default for Argon2Params {
    fn default() -> Self {
        Self {
            time_cost: 3,
            memory_cost: 65536, // 64 MB
            parallelism: 4,
        }
    }
}

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct EncryptionKey {
    key: [u8; 32],
}

impl EncryptionKey {
    /// Derive encryption key from password using Argon2id
    pub fn from_password(password: &str, salt: &[u8]) -> Result<Self, WalletError> {
        let params = Argon2Params::default();

        // Create Argon2 parameters
        let argon2_params = Params::new(
            params.memory_cost,
            params.time_cost,
            params.parallelism,
            Some(32), // Output length (256 bits = 32 bytes)
        ).map_err(|e| WalletError::CryptoError(format!("Invalid Argon2 params: {}", e)))?;

        let argon2 = Argon2::new(
            Algorithm::Argon2id,
            Version::V0x13,
            argon2_params,
        );

        let mut key = [0u8; 32];
        argon2
            .hash_password_into(password.as_bytes(), salt, &mut key)
            .map_err(|e| WalletError::CryptoError(format!("Key derivation failed: {}", e)))?;

        Ok(Self { key })
    }

    /// Get key as slice
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.key
    }
}

/// Encrypt data using AES-256-GCM
/// Returns: nonce (12 bytes) + ciphertext + auth_tag (16 bytes)
pub fn encrypt(data: &[u8], key: &EncryptionKey) -> Result<Vec<u8>, WalletError> {
    let cipher = Aes256Gcm::new_from_slice(key.as_bytes())
        .map_err(|e| WalletError::CryptoError(format!("Failed to create cipher: {}", e)))?;

    // Generate random nonce (96 bits = 12 bytes for GCM)
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt the data
    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| WalletError::CryptoError(format!("Encryption failed: {}", e)))?;

    // Combine nonce + ciphertext (ciphertext already includes auth tag)
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypt data using AES-256-GCM
/// Expects: nonce (12 bytes) + ciphertext + auth_tag (16 bytes)
pub fn decrypt(encrypted_data: &[u8], key: &EncryptionKey) -> Result<Vec<u8>, WalletError> {
    if encrypted_data.len() < 12 + 16 {
        return Err(WalletError::CryptoError("Encrypted data too short".to_string()));
    }

    let cipher = Aes256Gcm::new_from_slice(key.as_bytes())
        .map_err(|e| WalletError::CryptoError(format!("Failed to create cipher: {}", e)))?;

    // Extract nonce and ciphertext
    let nonce = Nonce::from_slice(&encrypted_data[..12]);
    let ciphertext = &encrypted_data[12..];

    // Decrypt the data
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| WalletError::CryptoError(format!("Decryption failed: {}", e)))?;

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let password = "test_password_123";
        let salt = b"test_salt_16byte";
        let data = b"Hello, Bitcoin Cold Wallet!";

        // Derive key
        let key = EncryptionKey::from_password(password, salt).unwrap();

        // Encrypt
        let encrypted = encrypt(data, &key).unwrap();
        assert!(encrypted.len() > data.len()); // Should be larger due to nonce + auth tag

        // Decrypt
        let decrypted = decrypt(&encrypted, &key).unwrap();
        assert_eq!(&decrypted, data);
    }

    #[test]
    fn test_wrong_password() {
        let password1 = "password1";
        let password2 = "password2";
        let salt = b"test_salt_16byte";
        let data = b"Secret data";

        let key1 = EncryptionKey::from_password(password1, salt).unwrap();
        let encrypted = encrypt(data, &key1).unwrap();

        let key2 = EncryptionKey::from_password(password2, salt).unwrap();
        let result = decrypt(&encrypted, &key2);
        assert!(result.is_err()); // Should fail with wrong password
    }

    #[test]
    fn test_key_derivation_consistency() {
        let password = "consistent_password";
        let salt = b"consistent_salt!";

        let key1 = EncryptionKey::from_password(password, salt).unwrap();
        let key2 = EncryptionKey::from_password(password, salt).unwrap();

        assert_eq!(key1.as_bytes(), key2.as_bytes());
    }
}
