// HD wallet implementation (BIP32/44)

use bitcoin::Network;
use bitcoin::bip32::{DerivationPath, Xpriv};
use crate::crypto::keys::{MasterKey, parse_derivation_path};
use crate::crypto::mnemonic::mnemonic_to_seed;
use crate::error::WalletError;

#[allow(dead_code)]
pub struct HDWallet {
    master_key: MasterKey,
    network: Network,
}

impl HDWallet {
    /// Create new HD wallet from mnemonic
    pub fn from_mnemonic(
        mnemonic: &str,
        passphrase: Option<&str>,
        network: Network,
    ) -> Result<Self, WalletError> {
        // Derive seed from mnemonic
        let seed = mnemonic_to_seed(mnemonic, passphrase)?;

        // Create master key from seed
        let master_key = MasterKey::from_seed(&seed, network)?;

        Ok(Self {
            master_key,
            network,
        })
    }

    /// Get master fingerprint as hex string
    pub fn fingerprint(&self) -> String {
        self.master_key.fingerprint()
    }

    /// Get master fingerprint as raw bytes
    pub fn fingerprint_bytes(&self) -> [u8; 4] {
        self.master_key.fingerprint_bytes()
    }

    #[allow(dead_code)]
    /// Get network
    pub fn network(&self) -> Network {
        self.network
    }

    /// Derive key at specific path
    pub fn derive_key(&self, path: &DerivationPath) -> Result<Xpriv, WalletError> {
        self.master_key.derive_path(path)
    }

    /// Derive key from path string
    pub fn derive_key_from_path(&self, path_str: &str) -> Result<Xpriv, WalletError> {
        let path = parse_derivation_path(path_str)?;
        self.derive_key(&path)
    }

    #[allow(dead_code)]
    /// Get master key (for advanced operations)
    pub fn master_key(&self) -> &MasterKey {
        &self.master_key
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hd_wallet_from_mnemonic() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let wallet = HDWallet::from_mnemonic(mnemonic, None, Network::Testnet).unwrap();

        // Should have a fingerprint
        let fingerprint = wallet.fingerprint();
        assert!(!fingerprint.is_empty());
        assert_eq!(fingerprint.len(), 8); // 4 bytes = 8 hex chars

        // Should have correct network
        assert_eq!(wallet.network(), Network::Testnet);
    }

    #[test]
    fn test_hd_wallet_with_passphrase() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

        let wallet1 = HDWallet::from_mnemonic(mnemonic, None, Network::Bitcoin).unwrap();
        let wallet2 = HDWallet::from_mnemonic(mnemonic, Some("password"), Network::Bitcoin).unwrap();

        // Different passphrase should produce different wallets
        assert_ne!(wallet1.fingerprint(), wallet2.fingerprint());
    }

    #[test]
    fn test_derive_key() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let wallet = HDWallet::from_mnemonic(mnemonic, None, Network::Bitcoin).unwrap();

        // Test derivation at standard BIP44 path
        let key = wallet.derive_key_from_path("m/44'/0'/0'/0/0").unwrap();

        // Key should be valid
        assert!(key.to_priv().to_bytes().len() > 0);
    }

    #[test]
    fn test_deterministic_wallet() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

        let wallet1 = HDWallet::from_mnemonic(mnemonic, None, Network::Bitcoin).unwrap();
        let wallet2 = HDWallet::from_mnemonic(mnemonic, None, Network::Bitcoin).unwrap();

        // Same mnemonic should produce same wallet
        assert_eq!(wallet1.fingerprint(), wallet2.fingerprint());

        // Same derivation should produce same keys
        let key1 = wallet1.derive_key_from_path("m/84'/0'/0'/0/0").unwrap();
        let key2 = wallet2.derive_key_from_path("m/84'/0'/0'/0/0").unwrap();

        assert_eq!(key1.to_priv().to_bytes(), key2.to_priv().to_bytes());
    }
}
