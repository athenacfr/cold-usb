// BIP32 key derivation

use std::str::FromStr;
use bitcoin::bip32::{DerivationPath, Xpriv};
use bitcoin::secp256k1::Secp256k1;
use bitcoin::Network;

use crate::error::WalletError;

pub struct MasterKey {
    pub extended_key: Xpriv,
}

// Manual Drop implementation for security
// Note: ExtendedPrivKey doesn't implement Zeroize,
// so we rely on its own Drop implementation
impl Drop for MasterKey {
    fn drop(&mut self) {
        // ExtendedPrivKey will be dropped normally
        // Future: implement manual zeroization if needed
    }
}

impl MasterKey {
    /// Derive master key from seed
    pub fn from_seed(seed: &[u8], network: Network) -> Result<Self, WalletError> {
        let extended_key = Xpriv::new_master(network, seed)
            .map_err(|e| WalletError::BitcoinError(format!("Failed to derive master key: {}", e)))?;

        Ok(Self { extended_key })
    }

    /// Get master fingerprint as hex string
    pub fn fingerprint(&self) -> String {
        let secp = Secp256k1::new();
        let fingerprint = self.extended_key.fingerprint(&secp);
        hex::encode(fingerprint.as_bytes())
    }

    /// Get master fingerprint as raw bytes
    pub fn fingerprint_bytes(&self) -> [u8; 4] {
        let secp = Secp256k1::new();
        let fingerprint = self.extended_key.fingerprint(&secp);
        *fingerprint.as_bytes()
    }

    /// Derive child key at path
    pub fn derive_path(&self, path: &DerivationPath) -> Result<Xpriv, WalletError> {
        let secp = Secp256k1::new();
        let derived_key = self.extended_key.derive_priv(&secp, path)
            .map_err(|e| WalletError::BitcoinError(format!("Failed to derive key: {}", e)))?;

        Ok(derived_key)
    }
}

/// Parse derivation path string
pub fn parse_derivation_path(path_str: &str) -> Result<DerivationPath, WalletError> {
    DerivationPath::from_str(path_str)
        .map_err(|e| WalletError::InvalidDerivationPath(format!("Invalid path '{}': {}", path_str, e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_master_key_from_seed() {
        // Test seed (64 bytes)
        let seed = [0u8; 64];
        let master_key = MasterKey::from_seed(&seed, Network::Testnet).unwrap();

        // Should have a fingerprint
        let fingerprint = master_key.fingerprint();
        assert!(!fingerprint.is_empty());
        assert_eq!(fingerprint.len(), 8); // 4 bytes = 8 hex chars
    }

    #[test]
    fn test_derive_child_key() {
        let seed = [1u8; 64];
        let master_key = MasterKey::from_seed(&seed, Network::Testnet).unwrap();

        // Derive at path m/44'/1'/0'/0/0
        let path = parse_derivation_path("m/44'/1'/0'/0/0").unwrap();
        let child_key = master_key.derive_path(&path).unwrap();

        // Child key should be different from master
        assert_ne!(child_key.to_priv().to_bytes(), master_key.extended_key.to_priv().to_bytes());
    }

    #[test]
    fn test_parse_derivation_path() {
        // Valid paths
        assert!(parse_derivation_path("m/44'/0'/0'/0/0").is_ok());
        assert!(parse_derivation_path("m/84'/0'/0'/0/0").is_ok());
        assert!(parse_derivation_path("m").is_ok());
        assert!(parse_derivation_path("m/0").is_ok());

        // Relative paths are also valid
        assert!(parse_derivation_path("44'/0'/0'").is_ok());

        // Invalid paths
        assert!(parse_derivation_path("invalid/path").is_err());
    }

    #[test]
    fn test_deterministic_derivation() {
        let seed = [2u8; 64];

        let master1 = MasterKey::from_seed(&seed, Network::Bitcoin).unwrap();
        let master2 = MasterKey::from_seed(&seed, Network::Bitcoin).unwrap();

        // Same seed should produce same master key
        assert_eq!(master1.fingerprint(), master2.fingerprint());

        // Same derivation should produce same result
        let path = parse_derivation_path("m/84'/0'/0'/0/0").unwrap();
        let child1 = master1.derive_path(&path).unwrap();
        let child2 = master2.derive_path(&path).unwrap();

        assert_eq!(child1.to_priv().to_bytes(), child2.to_priv().to_bytes());
    }
}
