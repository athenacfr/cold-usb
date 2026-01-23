// Tauri state management

use std::sync::Mutex;
use chrono::{DateTime, Utc};
use zeroize::{Zeroize, ZeroizeOnDrop};
use bitcoin::bip32::Xpriv;
use bitcoin::Network;

/// Global wallet state
pub struct WalletState {
    pub unlocked: Mutex<Option<UnlockedWallet>>,
    pub last_activity: Mutex<DateTime<Utc>>,
}

impl WalletState {
    pub fn new() -> Self {
        Self {
            unlocked: Mutex::new(None),
            last_activity: Mutex::new(Utc::now()),
        }
    }

    /// Unlock wallet and store in memory
    pub fn unlock(&self, mnemonic: String, network: Network, fingerprint: String) {
        if let Ok(mut unlocked) = self.unlocked.lock() {
            *unlocked = Some(UnlockedWallet {
                mnemonic,
                master_key: None, // Could derive later if needed
                network,
                fingerprint,
            });
        }
    }

    /// Get unlocked wallet data
    pub fn get_unlocked(&self) -> Option<UnlockedWallet> {
        if let Ok(unlocked) = self.unlocked.lock() {
            unlocked.clone()
        } else {
            None
        }
    }

    /// Update last activity timestamp
    pub fn update_activity(&self) {
        if let Ok(mut last) = self.last_activity.lock() {
            *last = Utc::now();
        }
    }

    /// Check if wallet is unlocked
    pub fn is_unlocked(&self) -> bool {
        if let Ok(unlocked) = self.unlocked.lock() {
            unlocked.is_some()
        } else {
            false
        }
    }

    /// Lock the wallet (clear from memory)
    pub fn lock(&self) {
        if let Ok(mut unlocked) = self.unlocked.lock() {
            *unlocked = None;
        }
    }
}

/// Unlocked wallet data (stored in memory)
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct UnlockedWallet {
    pub mnemonic: String,
    #[zeroize(skip)]
    pub master_key: Option<Xpriv>,
    #[zeroize(skip)]
    pub network: Network,
    pub fingerprint: String,
}

impl Default for WalletState {
    fn default() -> Self {
        Self::new()
    }
}
