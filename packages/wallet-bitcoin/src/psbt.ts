import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import type {
  PSBTDetails,
  PSBTInput,
  PSBTOutput,
  SignedPSBTResult,
  TransactionDetails,
  TxInput,
  TxOutput,
  TransactionSigner,
} from "@coldusb/wallet-core";
import type { BitcoinWalletInstance } from "./wallet";

bitcoin.initEccLib(ecc);

function decodePsbt(data: string, format: string): bitcoin.Psbt {
  switch (format.toLowerCase()) {
    case "base64":
      return bitcoin.Psbt.fromBase64(data);
    case "hex":
      return bitcoin.Psbt.fromHex(data);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function encodePsbt(psbt: bitcoin.Psbt, format: string): string {
  switch (format.toLowerCase()) {
    case "base64":
      return psbt.toBase64();
    case "hex":
      return psbt.toHex();
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function extractAddress(
  script: Buffer,
  network: bitcoin.Network,
): string | null {
  try {
    return bitcoin.address.fromOutputScript(script, network);
  } catch {
    return null;
  }
}

export function parsePSBT(
  data: string,
  format: string,
  network: bitcoin.Network,
): PSBTDetails {
  const psbt = decodePsbt(data, format);
  const tx = psbt.txInputs;
  const txOutputs = psbt.txOutputs;

  let totalInput = 0;
  const inputs: PSBTInput[] = [];

  for (let i = 0; i < psbt.data.inputs.length; i++) {
    const input = psbt.data.inputs[i];
    const txInput = tx[i];

    let amount = 0;
    let address: string | null = null;

    if (input.witnessUtxo) {
      amount = input.witnessUtxo.value;
      address = extractAddress(input.witnessUtxo.script, network);
    } else if (input.nonWitnessUtxo) {
      const prevTx = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo);
      const prevOut = prevTx.outs[txInput.index];
      if (prevOut) {
        amount = prevOut.value;
        address = extractAddress(prevOut.script, network);
      }
    }

    totalInput += amount;
    inputs.push({
      txid: txInput.hash.reverse().toString("hex"),
      vout: txInput.index,
      amount,
      address,
    });
  }

  let totalOutput = 0;
  const outputs: PSBTOutput[] = [];

  for (let i = 0; i < txOutputs.length; i++) {
    const out = txOutputs[i];
    const amount = out.value;
    totalOutput += amount;

    const address = extractAddress(out.script, network) ?? "Unknown";
    const psbtOut = psbt.data.outputs[i];
    const isChange =
      psbtOut?.bip32Derivation !== undefined &&
      psbtOut.bip32Derivation.length > 0;

    outputs.push({ address, amount, isChange });
  }

  const fee = totalInput - totalOutput;
  const txSize = psbt.data.globalMap.unsignedTx
    ? (psbt.data.globalMap.unsignedTx as any).tx.virtualSize()
    : 0;
  const feeRate = txSize > 0 ? fee / txSize : 0;

  return { inputs, outputs, fee, feeRate, totalInput, totalOutput };
}

export function signPSBT(
  data: string,
  format: string,
  walletInstance: BitcoinWalletInstance,
): SignedPSBTResult {
  const psbt = decodePsbt(data, format);
  const root = walletInstance.getRoot();
  const walletFingerprint = Buffer.from(root.fingerprint);

  let signedAny = false;

  for (let i = 0; i < psbt.data.inputs.length; i++) {
    const input = psbt.data.inputs[i];
    const derivations = input.bip32Derivation ?? [];

    for (const deriv of derivations) {
      // Check if this key belongs to our wallet
      if (!deriv.masterFingerprint.equals(walletFingerprint)) continue;

      // Derive the signing key
      const child = root.derivePath(deriv.path);

      try {
        psbt.signInput(i, child);
        signedAny = true;
      } catch {
        // Skip inputs we can't sign
        continue;
      }
    }
  }

  if (!signedAny) {
    throw new Error("No inputs could be signed with this wallet");
  }

  // Try to finalize
  let isFinalized = true;
  for (let i = 0; i < psbt.data.inputs.length; i++) {
    try {
      psbt.finalizeInput(i);
    } catch {
      isFinalized = false;
    }
  }

  let transactionHex: string | null = null;
  if (isFinalized) {
    try {
      transactionHex = psbt.extractTransaction().toHex();
    } catch {
      transactionHex = null;
    }
  }

  return {
    signedPsbt: encodePsbt(psbt, format),
    isFinalized,
    transactionHex,
  };
}

export function getTransactionDetails(
  data: string,
  format: string,
): TransactionDetails {
  const psbt = decodePsbt(data, format);
  const tx = (psbt.data.globalMap.unsignedTx as any).tx as bitcoin.Transaction;

  const inputs: TxInput[] = tx.ins.map((inp) => ({
    txid: inp.hash.reverse().toString("hex"),
    vout: inp.index,
    scriptSig: inp.script.toString("hex"),
    witness: inp.witness.map((w: Buffer) => w.toString("hex")),
    sequence: inp.sequence,
  }));

  const outputs: TxOutput[] = tx.outs.map((out) => ({
    value: out.value,
    scriptPubkey: out.script.toString("hex"),
    address: null,
  }));

  return {
    txid: tx.getId(),
    version: tx.version,
    locktime: tx.locktime,
    size: tx.byteLength(),
    vsize: tx.virtualSize(),
    weight: tx.weight(),
    inputs,
    outputs,
  };
}

export class BitcoinTransactionSigner implements TransactionSigner {
  private walletInstance: BitcoinWalletInstance;
  private network: bitcoin.Network;

  constructor(
    walletInstance: BitcoinWalletInstance,
    network: bitcoin.Network,
  ) {
    this.walletInstance = walletInstance;
    this.network = network;
  }

  parsePSBT(data: string, format: "base64" | "hex"): PSBTDetails {
    return parsePSBT(data, format, this.network);
  }

  signPSBT(data: string, format: "base64" | "hex"): SignedPSBTResult {
    return signPSBT(data, format, this.walletInstance);
  }
}
