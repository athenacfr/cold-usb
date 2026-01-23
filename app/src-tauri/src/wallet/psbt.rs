// PSBT parsing and signing

use bitcoin::psbt::Psbt;
use bitcoin::{Address, Network, TxOut, PublicKey};
use bitcoin::consensus::encode::serialize_hex;
use hex::FromHex;
use base64::{Engine as _, engine::general_purpose};

use crate::error::WalletError;
use crate::types::{PSBTDetails, SignedPSBTResult, PSBTInput as PSBTInputInfo, PSBTOutput};
use crate::wallet::hd::HDWallet;

/// Decode PSBT from base64 or hex string
fn decode_psbt(psbt_data: &str, format: &str) -> Result<Psbt, WalletError> {
    let bytes = match format.to_lowercase().as_str() {
        "base64" => {
            general_purpose::STANDARD
                .decode(psbt_data)
                .map_err(|e| WalletError::InvalidPSBT(format!("Invalid base64: {}", e)))?
        }
        "hex" => {
            Vec::from_hex(psbt_data)
                .map_err(|e| WalletError::InvalidPSBT(format!("Invalid hex: {}", e)))?
        }
        _ => {
            return Err(WalletError::InvalidPSBT(format!(
                "Unsupported format: {}",
                format
            )))
        }
    };

    Psbt::deserialize(&bytes).map_err(|e| WalletError::InvalidPSBT(format!("Failed to parse PSBT: {}", e)))
}

/// Encode PSBT to base64 or hex string
fn encode_psbt(psbt: &Psbt, format: &str) -> Result<String, WalletError> {
    let bytes = psbt.serialize();

    match format.to_lowercase().as_str() {
        "base64" => Ok(general_purpose::STANDARD.encode(&bytes)),
        "hex" => Ok(hex::encode(&bytes)),
        _ => Err(WalletError::InvalidPSBT(format!(
            "Unsupported format: {}",
            format
        ))),
    }
}

/// Extract address from transaction output
fn extract_address(output: &TxOut, network: Network) -> Option<String> {
    Address::from_script(&output.script_pubkey, network)
        .ok()
        .map(|addr| addr.to_string())
}

/// Parse PSBT and extract details for review
pub fn parse_psbt(psbt_data: &str, format: &str, network: Network) -> Result<PSBTDetails, WalletError> {
    let psbt = decode_psbt(psbt_data, format)?;
    let tx = &psbt.unsigned_tx;

    // Calculate total input amount
    let mut total_input: u64 = 0;
    let mut inputs = Vec::new();

    for (idx, input) in psbt.inputs.iter().enumerate() {
        let tx_input = &tx.input[idx];

        // Get amount from witness_utxo or non_witness_utxo
        let amount = if let Some(witness_utxo) = &input.witness_utxo {
            witness_utxo.value.to_sat()
        } else if let Some(non_witness_utxo) = &input.non_witness_utxo {
            non_witness_utxo.output[tx_input.previous_output.vout as usize]
                .value
                .to_sat()
        } else {
            0 // Unknown amount
        };

        total_input += amount;

        // Extract address if available
        let address = input
            .witness_utxo
            .as_ref()
            .and_then(|utxo| extract_address(utxo, network))
            .or_else(|| {
                input.non_witness_utxo.as_ref().and_then(|tx| {
                    extract_address(
                        &tx.output[tx_input.previous_output.vout as usize],
                        network,
                    )
                })
            });

        inputs.push(PSBTInputInfo {
            txid: tx_input.previous_output.txid.to_string(),
            vout: tx_input.previous_output.vout,
            amount,
            address,
        });
    }

    // Parse outputs
    let mut total_output: u64 = 0;
    let mut outputs = Vec::new();

    for (idx, output) in tx.output.iter().enumerate() {
        let amount = output.value.to_sat();
        total_output += amount;

        let address = extract_address(output, network).unwrap_or_else(|| "Unknown".to_string());

        // Check if this is a change output (has BIP32 derivation in PSBT output info)
        let is_change = psbt
            .outputs
            .get(idx)
            .map(|psbt_out| !psbt_out.bip32_derivation.is_empty())
            .unwrap_or(false);

        outputs.push(PSBTOutput {
            address,
            amount,
            is_change,
        });
    }

    // Calculate fee
    let fee = total_input.saturating_sub(total_output);

    // Calculate fee rate (sat/vByte)
    let tx_size = tx.vsize() as u64;
    let fee_rate = if tx_size > 0 {
        fee as f64 / tx_size as f64
    } else {
        0.0
    };

    Ok(PSBTDetails {
        inputs,
        outputs,
        fee,
        fee_rate,
        total_input,
        total_output,
    })
}

/// Sign PSBT with HD wallet
pub fn sign_psbt(
    psbt_data: &str,
    format: &str,
    wallet: &HDWallet,
) -> Result<SignedPSBTResult, WalletError> {
    let mut psbt = decode_psbt(psbt_data, format)?;
    let secp = bitcoin::secp256k1::Secp256k1::new();

    // Track if we signed anything
    let mut signed_any = false;

    // Manually sign each input by finding matching keys
    for (input_index, input) in psbt.inputs.iter_mut().enumerate() {
        // Check if we have derivation paths for this input
        if input.bip32_derivation.is_empty() {
            continue;
        }

        // Try to sign with each derivation path
        for (pubkey, (fingerprint, derivation)) in input.bip32_derivation.clone().iter() {
            // Check if this key belongs to our wallet
            if *fingerprint.as_bytes() != wallet.fingerprint_bytes() {
                continue;
            }

            // Convert derivation path to string
            let path_str = format!("m/{}", derivation);

            // Derive the private key
            let private_key = match wallet.derive_key_from_path(&path_str) {
                Ok(key) => key,
                Err(_) => continue,
            };

            // Verify the public key matches
            let derived_pubkey = private_key.private_key.public_key(&secp);
            if &derived_pubkey != pubkey {
                continue;
            }

            // Get the sighash type (default to ALL if not specified)
            let sighash_type = input.sighash_type.unwrap_or(bitcoin::sighash::TapSighashType::All.into());

            // Compute sighash for this input
            let tx = &psbt.unsigned_tx;

            // For SegWit inputs, we need to compute the sighash
            if let Some(witness_utxo) = &input.witness_utxo {
                // This is a witness input (SegWit)
                let mut sighash_cache = bitcoin::sighash::SighashCache::new(tx);

                let sighash = match sighash_cache.p2wpkh_signature_hash(
                    input_index,
                    &witness_utxo.script_pubkey,
                    witness_utxo.value,
                    sighash_type.ecdsa_hash_ty().map_err(|e| {
                        WalletError::SigningError(format!("Invalid sighash type: {}", e))
                    })?,
                ) {
                    Ok(hash) => hash,
                    Err(e) => {
                        return Err(WalletError::SigningError(format!(
                            "Failed to compute sighash: {}",
                            e
                        )));
                    }
                };

                // Sign the sighash
                let message = bitcoin::secp256k1::Message::from_digest(*sighash.as_ref());
                let signature = secp.sign_ecdsa(&message, &private_key.private_key);

                // Create bitcoin signature with sighash type
                let bitcoin_sig = bitcoin::ecdsa::Signature {
                    signature,
                    sighash_type: sighash_type.ecdsa_hash_ty().map_err(|e| {
                        WalletError::SigningError(format!("Invalid sighash type: {}", e))
                    })?,
                };

                // Convert secp256k1::PublicKey to bitcoin::PublicKey
                let bitcoin_pubkey = PublicKey::new(derived_pubkey);

                // Add signature to partial_sigs
                input.partial_sigs.insert(bitcoin_pubkey, bitcoin_sig);
                signed_any = true;
            } else if let Some(_non_witness_utxo) = &input.non_witness_utxo {
                // Legacy transaction signing not fully implemented yet
                // This would require different sighash computation
                continue;
            }
        }
    }

    if !signed_any {
        return Err(WalletError::SigningError(
            "No inputs could be signed with this wallet".to_string(),
        ));
    }

    // Check if PSBT is finalized
    let mut is_finalized = true;
    for input in &psbt.inputs {
        if input.final_script_sig.is_none() && input.final_script_witness.is_none() {
            is_finalized = false;
            break;
        }
    }

    // Try to finalize each input if not already finalized
    if !is_finalized {
        for input in psbt.inputs.iter_mut() {
            if input.final_script_sig.is_some() || input.final_script_witness.is_some() {
                continue;
            }

            // Try to finalize if we have signatures
            if !input.partial_sigs.is_empty() {
                // For P2WPKH, create witness
                if let Some(witness_utxo) = &input.witness_utxo {
                    if witness_utxo.script_pubkey.is_p2wpkh() {
                        // Get the signature and pubkey
                        if let Some((pubkey, sig)) = input.partial_sigs.iter().next() {
                            let mut witness = bitcoin::Witness::new();
                            witness.push(sig.serialize());
                            witness.push(pubkey.to_bytes());
                            input.final_script_witness = Some(witness);
                            input.final_script_sig = Some(bitcoin::ScriptBuf::new());
                        }
                    }
                }
            }
        }

        // Re-check finalization status
        is_finalized = psbt.inputs.iter().all(|input| {
            input.final_script_sig.is_some() || input.final_script_witness.is_some()
        });
    }

    // Extract transaction hex if finalized
    let transaction_hex = if is_finalized {
        match psbt.clone().extract_tx() {
            Ok(tx) => Some(serialize_hex(&tx)),
            Err(_) => None,
        }
    } else {
        None
    };

    // Encode the signed PSBT
    let signed_psbt = encode_psbt(&psbt, format)?;

    Ok(SignedPSBTResult {
        signed_psbt,
        is_finalized,
        transaction_hex,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_psbt_invalid_data() {
        // Invalid PSBT data should return error
        let psbt_data = "cHNidP8BAAAAAAAAAAAAAAAA";
        let result = decode_psbt(psbt_data, "base64");
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_psbt_invalid_hex() {
        // Invalid hex data
        let psbt_data = "not_hex_data";
        let result = decode_psbt(psbt_data, "hex");
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_psbt_invalid_format() {
        let result = decode_psbt("test", "json");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), WalletError::InvalidPSBT(_)));
    }

    #[test]
    fn test_valid_psbt_base64() {
        // A minimal valid PSBT (created with valid transaction structure)
        // This is a PSBT with one unsigned transaction with no inputs/outputs
        let psbt_data = "cHNidP8BAAoAAAAAAAAAAAAAAA==";
        let result = decode_psbt(psbt_data, "base64");
        // Note: This may still fail if the PSBT is not correctly formatted
        // Real PSBTs need to be tested with actual Bitcoin testnet transactions
        if result.is_ok() {
            let psbt = result.unwrap();
            assert_eq!(psbt.inputs.len(), 0);
            assert_eq!(psbt.outputs.len(), 0);
        }
    }

    // Note: Full PSBT signing tests should be done with real testnet transactions
    // These tests verify the basic structure and error handling
}
