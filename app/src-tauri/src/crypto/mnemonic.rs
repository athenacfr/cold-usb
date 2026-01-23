// BIP39 mnemonic operations

use std::str::FromStr;
use bip39::{Language, Mnemonic};
use rand::RngCore;

use crate::error::WalletError;

/// Generate a new BIP39 mnemonic
pub fn generate_mnemonic(word_count: u8) -> Result<String, WalletError> {
    // Determine entropy size based on word count
    // 12 words = 128 bits = 16 bytes
    // 24 words = 256 bits = 32 bytes
    let entropy_size = match word_count {
        12 => 16,
        24 => 32,
        _ => return Err(WalletError::InvalidMnemonic),
    };

    // Generate random entropy
    let mut entropy = vec![0u8; entropy_size];
    rand::rng().fill_bytes(&mut entropy);

    // Create mnemonic from entropy
    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy)
        .map_err(|e| WalletError::CryptoError(format!("Failed to generate mnemonic: {}", e)))?;

    Ok(mnemonic.to_string())
}

/// Validate a BIP39 mnemonic
pub fn validate_mnemonic(mnemonic: &str) -> Result<bool, WalletError> {
    match Mnemonic::from_str(mnemonic) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Get BIP39 wordlist
pub fn get_wordlist() -> Vec<String> {
    Language::English
        .word_list()
        .iter()
        .map(|&word| word.to_string())
        .collect()
}

/// Derive seed from mnemonic and optional passphrase
pub fn mnemonic_to_seed(mnemonic: &str, passphrase: Option<&str>) -> Result<[u8; 64], WalletError> {
    let mnemonic = Mnemonic::from_str(mnemonic)
        .map_err(|_| WalletError::InvalidMnemonic)?;

    let passphrase = passphrase.unwrap_or("");
    let seed = mnemonic.to_seed(passphrase);

    Ok(seed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_12_word_mnemonic() {
        let mnemonic = generate_mnemonic(12).unwrap();
        let words: Vec<&str> = mnemonic.split_whitespace().collect();
        assert_eq!(words.len(), 12);
        assert!(validate_mnemonic(&mnemonic).unwrap());
    }

    #[test]
    fn test_generate_24_word_mnemonic() {
        let mnemonic = generate_mnemonic(24).unwrap();
        let words: Vec<&str> = mnemonic.split_whitespace().collect();
        assert_eq!(words.len(), 24);
        assert!(validate_mnemonic(&mnemonic).unwrap());
    }

    #[test]
    fn test_validate_valid_mnemonic() {
        let valid = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        assert!(validate_mnemonic(valid).unwrap());
    }

    #[test]
    fn test_validate_invalid_mnemonic() {
        let invalid = "invalid mnemonic phrase that will not validate properly";
        assert!(!validate_mnemonic(invalid).unwrap());
    }

    #[test]
    fn test_mnemonic_to_seed() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let seed = mnemonic_to_seed(mnemonic, None).unwrap();
        assert_eq!(seed.len(), 64);

        // Test with passphrase
        let seed_with_pass = mnemonic_to_seed(mnemonic, Some("password")).unwrap();
        assert_eq!(seed_with_pass.len(), 64);

        // Seeds should be different
        assert_ne!(seed, seed_with_pass);
    }

    #[test]
    fn test_get_wordlist() {
        let wordlist = get_wordlist();
        assert_eq!(wordlist.len(), 2048); // BIP39 English wordlist has 2048 words
        assert!(wordlist.contains(&"abandon".to_string()));
        assert!(wordlist.contains(&"zoo".to_string()));
    }
}
