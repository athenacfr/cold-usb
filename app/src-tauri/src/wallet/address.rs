// Address derivation from HD wallet

use bitcoin::bip32::Xpriv;
use bitcoin::secp256k1::Secp256k1;
use bitcoin::{Address, Network};
use bitcoin::key::CompressedPublicKey;
use crate::error::WalletError;
use crate::types::AddressInfo;

/// Script type for address generation
#[derive(Debug, Clone, Copy)]
pub enum ScriptType {
    /// Native SegWit (P2WPKH) - BIP84
    NativeSegwit,
    /// Taproot (P2TR) - BIP86
    Taproot,
}

/// Derive P2WPKH (Native SegWit) address from extended private key
pub fn derive_p2wpkh_address(
    key: &Xpriv,
    network: Network,
) -> Result<Address, WalletError> {
    let secp = Secp256k1::new();
    let public_key = key.to_priv().public_key(&secp);
    let compressed_pubkey = CompressedPublicKey(public_key.inner);

    let address = Address::p2wpkh(&compressed_pubkey, network);

    Ok(address)
}

/// Derive P2TR (Taproot) address from extended private key
pub fn derive_p2tr_address(
    key: &Xpriv,
    network: Network,
) -> Result<Address, WalletError> {
    let secp = Secp256k1::new();
    let public_key = key.to_priv().public_key(&secp);
    let x_only_pubkey = public_key.inner.x_only_public_key().0;

    let address = Address::p2tr(&secp, x_only_pubkey, None, network);

    Ok(address)
}

/// Derive address from extended private key with specified script type
pub fn derive_address_from_key(
    key: &Xpriv,
    script_type: ScriptType,
    derivation_path: &str,
    network: Network,
) -> Result<AddressInfo, WalletError> {
    let secp = Secp256k1::new();
    let public_key = key.to_priv().public_key(&secp);

    let address = match script_type {
        ScriptType::NativeSegwit => derive_p2wpkh_address(key, network)?,
        ScriptType::Taproot => derive_p2tr_address(key, network)?,
    };

    let script_type_str = match script_type {
        ScriptType::NativeSegwit => "p2wpkh",
        ScriptType::Taproot => "p2tr",
    };

    Ok(AddressInfo {
        address: address.to_string(),
        derivation_path: derivation_path.to_string(),
        script_type: script_type_str.to_string(),
        public_key: hex::encode(public_key.inner.serialize()),
    })
}

/// Helper to create standard BIP84 derivation path (Native SegWit)
/// m/84'/0'/0'/0/0 for mainnet, m/84'/1'/0'/0/0 for testnet
pub fn bip84_path(account: u32, change: u32, index: u32, network: Network) -> String {
    let coin_type = match network {
        Network::Bitcoin => 0,
        _ => 1, // Testnet, Regtest, Signet
    };
    format!("m/84'/{}'/{}'/{}/{}", coin_type, account, change, index)
}

/// Helper to create standard BIP86 derivation path (Taproot)
/// m/86'/0'/0'/0/0 for mainnet, m/86'/1'/0'/0/0 for testnet
#[allow(dead_code)]
pub fn bip86_path(account: u32, change: u32, index: u32, network: Network) -> String {
    let coin_type = match network {
        Network::Bitcoin => 0,
        _ => 1,
    };
    format!("m/86'/{}'/{}'/{}/{}", coin_type, account, change, index)
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::bip32::Xpriv;
    use crate::crypto::keys::MasterKey;

    fn create_test_key() -> Xpriv {
        let seed = [0u8; 64];
        let master = MasterKey::from_seed(&seed, Network::Testnet).unwrap();
        master.extended_key
    }

    #[test]
    fn test_derive_p2wpkh_address() {
        let key = create_test_key();
        let address = derive_p2wpkh_address(&key, Network::Testnet).unwrap();

        let addr_str = address.to_string();
        // Testnet P2WPKH addresses start with "tb1q"
        assert!(addr_str.starts_with("tb1q"));
    }

    #[test]
    fn test_derive_p2tr_address() {
        let key = create_test_key();
        let address = derive_p2tr_address(&key, Network::Testnet).unwrap();

        let addr_str = address.to_string();
        // Testnet P2TR addresses start with "tb1p"
        assert!(addr_str.starts_with("tb1p"));
    }

    #[test]
    fn test_derive_address_from_key() {
        let key = create_test_key();

        // Test Native SegWit
        let addr_info = derive_address_from_key(
            &key,
            ScriptType::NativeSegwit,
            "m/84'/1'/0'/0/0",
            Network::Testnet,
        ).unwrap();

        assert!(addr_info.address.starts_with("tb1q"));
        assert_eq!(addr_info.script_type, "p2wpkh");
        assert_eq!(addr_info.derivation_path, "m/84'/1'/0'/0/0");
        assert!(!addr_info.public_key.is_empty());

        // Test Taproot
        let addr_info_tr = derive_address_from_key(
            &key,
            ScriptType::Taproot,
            "m/86'/1'/0'/0/0",
            Network::Testnet,
        ).unwrap();

        assert!(addr_info_tr.address.starts_with("tb1p"));
        assert_eq!(addr_info_tr.script_type, "p2tr");
    }

    #[test]
    fn test_bip84_path() {
        let path = bip84_path(0, 0, 0, Network::Bitcoin);
        assert_eq!(path, "m/84'/0'/0'/0/0");

        let path_testnet = bip84_path(0, 0, 5, Network::Testnet);
        assert_eq!(path_testnet, "m/84'/1'/0'/0/5");
    }

    #[test]
    fn test_bip86_path() {
        let path = bip86_path(0, 0, 0, Network::Bitcoin);
        assert_eq!(path, "m/86'/0'/0'/0/0");

        let path_testnet = bip86_path(1, 1, 10, Network::Testnet);
        assert_eq!(path_testnet, "m/86'/1'/1'/1/10");
    }

    #[test]
    fn test_deterministic_addresses() {
        let key1 = create_test_key();
        let key2 = create_test_key();

        let addr1 = derive_p2wpkh_address(&key1, Network::Testnet).unwrap();
        let addr2 = derive_p2wpkh_address(&key2, Network::Testnet).unwrap();

        // Same seed should produce same addresses
        assert_eq!(addr1.to_string(), addr2.to_string());
    }
}
