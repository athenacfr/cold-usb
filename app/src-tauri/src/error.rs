// Custom error types

use thiserror::Error;

#[derive(Debug, Error)]
pub enum WalletError {
    #[error("Invalid password")]
    InvalidPassword,

    #[error("Invalid mnemonic")]
    InvalidMnemonic,

    #[error("Wallet is locked")]
    WalletLocked,

    #[error("Wallet already exists")]
    WalletExists,

    #[error("Wallet not found")]
    WalletNotFound,

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Cryptographic error: {0}")]
    CryptoError(String),

    #[error("Invalid derivation path: {0}")]
    InvalidDerivationPath(String),

    #[error("PSBT parsing error: {0}")]
    PSBTError(String),

    #[error("Invalid PSBT: {0}")]
    InvalidPSBT(String),

    #[error("Signing error: {0}")]
    SigningError(String),

    #[error("Bitcoin error: {0}")]
    BitcoinError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Convert WalletError to String for Tauri commands
impl From<WalletError> for String {
    fn from(err: WalletError) -> String {
        err.to_string()
    }
}
