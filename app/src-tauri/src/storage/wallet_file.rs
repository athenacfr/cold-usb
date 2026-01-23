// Wallet file format

use chrono::{DateTime, Utc};
use bitcoin::Network;
use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Wallet file structure (encrypted)
#[derive(Serialize, Deserialize)]
pub struct WalletFile {
    pub version: u32,
    pub salt: Vec<u8>,
    pub nonce: Vec<u8>,
    pub encrypted_data: Vec<u8>,
    pub auth_tag: Vec<u8>,
}

/// Wallet payload (decrypted)
#[derive(Debug, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct WalletPayload {
    pub mnemonic: String,
    pub passphrase: Option<String>,
    #[zeroize(skip)]
    pub network: Network,
    pub fingerprint: String,
    #[zeroize(skip)]
    pub created_at: DateTime<Utc>,
}

impl WalletFile {
    /// Current wallet file format version
    pub const VERSION: u32 = 1;

    /// Create new wallet file
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            version: Self::VERSION,
            salt: vec![],
            nonce: vec![],
            encrypted_data: vec![],
            auth_tag: vec![],
        }
    }
}
