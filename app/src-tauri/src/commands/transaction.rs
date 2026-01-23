// PSBT transaction commands

use tauri::State;
use bitcoin::psbt::Psbt;
use hex::FromHex;
use base64::{Engine as _, engine::general_purpose};

use crate::types::{PSBTDetails, SignedPSBTResult, TransactionDetails, TxInput, TxOutput};
use crate::state::WalletState;
use crate::wallet::hd::HDWallet;
use crate::wallet::psbt::{parse_psbt as parse_psbt_internal, sign_psbt as sign_psbt_internal};

/// Parse PSBT and extract details for review
#[tauri::command]
pub async fn parse_psbt(
    psbt_data: String,
    format: String,
    state: State<'_, WalletState>,
) -> Result<PSBTDetails, String> {
    // Check if wallet is unlocked to get network info
    let unlocked = state
        .get_unlocked()
        .ok_or_else(|| "Wallet is locked".to_string())?;

    let network = unlocked.network;

    // Parse PSBT
    let details = parse_psbt_internal(&psbt_data, &format, network)
        .map_err(|e| format!("Failed to parse PSBT: {}", e))?;

    state.update_activity();

    Ok(details)
}

/// Sign PSBT with wallet keys
#[tauri::command]
pub async fn sign_psbt(
    psbt_data: String,
    format: String,
    state: State<'_, WalletState>,
) -> Result<SignedPSBTResult, String> {
    // Check if wallet is unlocked
    let unlocked = state
        .get_unlocked()
        .ok_or_else(|| "Wallet is locked".to_string())?;

    let mnemonic = unlocked.mnemonic.clone();
    let network = unlocked.network;

    // Create HD wallet from mnemonic
    let wallet = HDWallet::from_mnemonic(&mnemonic, None, network)
        .map_err(|e| format!("Failed to create wallet: {}", e))?;

    // Sign the PSBT
    let result = sign_psbt_internal(&psbt_data, &format, &wallet)
        .map_err(|e| format!("Failed to sign PSBT: {}", e))?;

    state.update_activity();

    Ok(result)
}

/// Extract transaction details from PSBT
#[tauri::command]
pub async fn get_transaction_details(
    psbt_data: String,
    format: String,
) -> Result<TransactionDetails, String> {
    // Decode PSBT
    let bytes = match format.to_lowercase().as_str() {
        "base64" => general_purpose::STANDARD
            .decode(&psbt_data)
            .map_err(|e| format!("Invalid base64: {}", e))?,
        "hex" => Vec::from_hex(&psbt_data).map_err(|e| format!("Invalid hex: {}", e))?,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    let psbt = Psbt::deserialize(&bytes).map_err(|e| format!("Failed to parse PSBT: {}", e))?;

    let tx = &psbt.unsigned_tx;

    // Extract inputs
    let inputs: Vec<TxInput> = tx
        .input
        .iter()
        .map(|input| TxInput {
            txid: input.previous_output.txid.to_string(),
            vout: input.previous_output.vout,
            script_sig: hex::encode(input.script_sig.to_bytes()),
            witness: input
                .witness
                .iter()
                .map(hex::encode)
                .collect(),
            sequence: input.sequence.0,
        })
        .collect();

    // Extract outputs
    let outputs: Vec<TxOutput> = tx
        .output
        .iter()
        .map(|output| TxOutput {
            value: output.value.to_sat(),
            script_pubkey: hex::encode(output.script_pubkey.to_bytes()),
            address: None, // Would need network to extract address
        })
        .collect();

    Ok(TransactionDetails {
        txid: tx.compute_txid().to_string(),
        version: tx.version.0 as u32,
        locktime: tx.lock_time.to_consensus_u32(),
        size: bitcoin::consensus::encode::serialize(tx).len(),
        vsize: tx.vsize(),
        weight: tx.weight().to_wu() as usize,
        inputs,
        outputs,
    })
}
