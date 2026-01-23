// Shared types for Tauri commands

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Wallet information (non-sensitive)
#[derive(Serialize, Deserialize, Clone)]
pub struct WalletInfo {
    pub network: String,
    pub fingerprint: String,
    pub created_at: DateTime<Utc>,
    pub is_locked: bool,
}

/// Address information
#[derive(Serialize, Deserialize, Clone)]
pub struct AddressInfo {
    pub address: String,
    pub derivation_path: String,
    pub script_type: String,
    pub public_key: String,
}

/// PSBT details for review
#[derive(Serialize, Deserialize, Clone)]
pub struct PSBTDetails {
    pub inputs: Vec<PSBTInput>,
    pub outputs: Vec<PSBTOutput>,
    pub fee: u64,
    pub fee_rate: f64,
    pub total_input: u64,
    pub total_output: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PSBTInput {
    pub txid: String,
    pub vout: u32,
    pub amount: u64,
    pub address: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PSBTOutput {
    pub address: String,
    pub amount: u64,
    pub is_change: bool,
}

/// Signed PSBT result
#[derive(Serialize, Deserialize, Clone)]
pub struct SignedPSBTResult {
    pub signed_psbt: String,
    pub is_finalized: bool,
    pub transaction_hex: Option<String>,
}

/// Transaction details
#[derive(Serialize, Deserialize, Clone)]
pub struct TransactionDetails {
    pub txid: String,
    pub version: u32,
    pub locktime: u32,
    pub size: usize,
    pub vsize: usize,
    pub weight: usize,
    pub inputs: Vec<TxInput>,
    pub outputs: Vec<TxOutput>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TxInput {
    pub txid: String,
    pub vout: u32,
    pub script_sig: String,
    pub witness: Vec<String>,
    pub sequence: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TxOutput {
    pub value: u64,
    pub script_pubkey: String,
    pub address: Option<String>,
}
