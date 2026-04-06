import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
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

const MAINNET: btc.BTC_NETWORK = { bech32: "bc", pubKeyHash: 0x00, scriptHash: 0x05, wif: 0x80 };
const TESTNET: btc.BTC_NETWORK = { bech32: "tb", pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef };
const REGTEST: btc.BTC_NETWORK = { bech32: "bcrt", pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef };

function resolveNetwork(network?: string): btc.BTC_NETWORK {
  switch (network?.toLowerCase()) {
    case "bitcoin":
    case "mainnet":
      return MAINNET;
    case "testnet":
      return TESTNET;
    case "regtest":
      return REGTEST;
    default:
      return MAINNET;
  }
}

function decodePsbt(data: string, format: string): btc.Transaction {
  switch (format.toLowerCase()) {
    case "base64": {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      return btc.Transaction.fromPSBT(bytes);
    }
    case "hex":
      return btc.Transaction.fromPSBT(hex.decode(data));
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function encodePsbt(tx: btc.Transaction, format: string): string {
  const bytes = tx.toPSBT();
  switch (format.toLowerCase()) {
    case "base64":
      return btoa(String.fromCharCode(...bytes));
    case "hex":
      return hex.encode(bytes);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export function parsePSBT(
  data: string,
  format: string,
  network: string,
): PSBTDetails {
  const tx = decodePsbt(data, format);
  const net = resolveNetwork(network);

  let totalInput = 0;
  const inputs: PSBTInput[] = [];

  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    const amount = Number(input.witnessUtxo?.amount ?? 0n);
    totalInput += amount;

    let address: string | null = null;
    if (input.witnessUtxo?.script) {
      try {
        address = btc.Address(net).decode(
          btc.OutScript.decode(input.witnessUtxo.script)
        ) as string;
      } catch {}
    }

    inputs.push({
      txid: input.txid ? hex.encode(input.txid) : "",
      vout: input.index ?? 0,
      amount,
      address,
    });
  }

  let totalOutput = 0;
  const outputs: PSBTOutput[] = [];

  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i);
    const amount = Number(output.amount ?? 0n);
    totalOutput += amount;

    let address = "Unknown";
    if (output.script) {
      try {
        address = btc.Address(net).decode(
          btc.OutScript.decode(output.script)
        ) as string;
      } catch {}
    }

    const isChange = (output.bip32Derivation?.length ?? 0) > 0;
    outputs.push({ address, amount, isChange });
  }

  const fee = totalInput - totalOutput;
  const feeRate = 0; // vsize not easily available pre-signing

  return { inputs, outputs, fee, feeRate, totalInput, totalOutput };
}

export function signPSBT(
  data: string,
  format: string,
  walletInstance: BitcoinWalletInstance,
): SignedPSBTResult {
  const tx = decodePsbt(data, format);
  const root = walletInstance.getRoot();
  const walletFp = root.fingerprint;

  let signedAny = false;

  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    const derivations = input.bip32Derivation ?? [];

    for (const [_pubkey, { fingerprint, path }] of derivations) {
      if (fingerprint !== walletFp) continue;

      // Reconstruct derivation path string from path array
      const pathStr = "m/" + path.map((p) =>
        p >= 0x80000000 ? `${p - 0x80000000}'` : `${p}`
      ).join("/");

      const child = root.derive(pathStr);
      if (!child.privateKey) continue;

      try {
        tx.signIdx(child.privateKey, i);
        signedAny = true;
      } catch {
        continue;
      }
    }
  }

  if (!signedAny) {
    throw new Error("No inputs could be signed with this wallet");
  }

  // Try to finalize
  let isFinalized = true;
  try {
    tx.finalize();
  } catch {
    isFinalized = false;
  }

  let transactionHex: string | null = null;
  if (isFinalized) {
    try {
      transactionHex = tx.hex;
    } catch {
      transactionHex = null;
    }
  }

  return {
    signedPsbt: encodePsbt(tx, format),
    isFinalized,
    transactionHex,
  };
}

export function getTransactionDetails(
  data: string,
  format: string,
): TransactionDetails {
  const tx = decodePsbt(data, format);

  const inputs: TxInput[] = [];
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    inputs.push({
      txid: input.txid ? hex.encode(input.txid) : "",
      vout: input.index ?? 0,
      scriptSig: "",
      witness: [],
      sequence: input.sequence ?? 0xffffffff,
    });
  }

  const outputs: TxOutput[] = [];
  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i);
    outputs.push({
      value: Number(output.amount ?? 0n),
      scriptPubkey: output.script ? hex.encode(output.script) : "",
      address: null,
    });
  }

  return {
    txid: tx.id ?? "",
    version: 2,
    locktime: 0,
    size: 0,
    vsize: 0,
    weight: 0,
    inputs,
    outputs,
  };
}

export class BitcoinTransactionSigner implements TransactionSigner {
  private walletInstance: BitcoinWalletInstance;

  constructor(walletInstance: BitcoinWalletInstance) {
    this.walletInstance = walletInstance;
  }

  parsePSBT(data: string, format: "base64" | "hex"): PSBTDetails {
    return parsePSBT(data, format, this.walletInstance.getNetworkName());
  }

  signPSBT(data: string, format: "base64" | "hex"): SignedPSBTResult {
    return signPSBT(data, format, this.walletInstance);
  }
}
