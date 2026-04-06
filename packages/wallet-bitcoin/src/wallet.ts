import * as bitcoin from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import type { BIP32Interface } from "bip32";
import * as ecc from "tiny-secp256k1";
import type {
  AddressInfo,
  WalletInstance,
  ChainWallet,
} from "@coldusb/wallet-core";
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from "./mnemonic";

const bip32 = BIP32Factory(ecc);

// Initialize ECC library for bitcoinjs-lib (required for Taproot)
bitcoin.initEccLib(ecc);

function getNetwork(network?: string): bitcoin.Network {
  switch (network?.toLowerCase()) {
    case "bitcoin":
    case "mainnet":
      return bitcoin.networks.bitcoin;
    case "testnet":
      return bitcoin.networks.testnet;
    case "regtest":
      return bitcoin.networks.regtest;
    default:
      return bitcoin.networks.bitcoin;
  }
}

function getCoinType(network: bitcoin.Network): number {
  return network === bitcoin.networks.bitcoin ? 0 : 1;
}

export class BitcoinWalletInstance implements WalletInstance {
  private root: BIP32Interface;
  private network: bitcoin.Network;

  constructor(root: BIP32Interface, network: bitcoin.Network) {
    this.root = root;
    this.network = network;
  }

  fingerprint(): string {
    return Buffer.from(this.root.fingerprint).toString("hex");
  }

  deriveAddress(path: string): AddressInfo {
    const child = this.root.derivePath(path);
    const scriptType = path.startsWith("m/86'") ? "p2tr" : "p2wpkh";

    if (scriptType === "p2tr") {
      return this.deriveTaprootAddress(child, path);
    }
    return this.deriveSegwitAddress(child, path);
  }

  deriveAddresses(
    account: number,
    change: number,
    startIndex: number,
    count: number,
  ): AddressInfo[] {
    const addresses: AddressInfo[] = [];
    for (let i = 0; i < count; i++) {
      const index = startIndex + i;
      const path = this.bip84Path(account, change, index);
      addresses.push(this.deriveAddress(path));
    }
    return addresses;
  }

  deriveBIP84Address(
    account: number,
    change: number,
    index: number,
  ): AddressInfo {
    const path = this.bip84Path(account, change, index);
    return this.deriveAddress(path);
  }

  deriveBIP86Address(
    account: number,
    change: number,
    index: number,
  ): AddressInfo {
    const path = this.bip86Path(account, change, index);
    return this.deriveAddress(path);
  }

  private deriveSegwitAddress(
    child: BIP32Interface,
    path: string,
  ): AddressInfo {
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: this.network,
    });
    if (!address) throw new Error("Failed to derive P2WPKH address");

    return {
      address,
      derivationPath: path,
      scriptType: "p2wpkh",
      publicKey: child.publicKey.toString("hex"),
    };
  }

  private deriveTaprootAddress(
    child: BIP32Interface,
    path: string,
  ): AddressInfo {
    const xOnlyPubkey = child.publicKey.subarray(1, 33);
    const { address } = bitcoin.payments.p2tr({
      internalPubkey: xOnlyPubkey,
      network: this.network,
    });
    if (!address) throw new Error("Failed to derive P2TR address");

    return {
      address,
      derivationPath: path,
      scriptType: "p2tr",
      publicKey: child.publicKey.toString("hex"),
    };
  }

  bip84Path(account: number, change: number, index: number): string {
    const coin = getCoinType(this.network);
    return `m/84'/${coin}'/${account}'/${change}/${index}`;
  }

  bip86Path(account: number, change: number, index: number): string {
    const coin = getCoinType(this.network);
    return `m/86'/${coin}'/${account}'/${change}/${index}`;
  }

  getRoot(): BIP32Interface {
    return this.root;
  }

  getNetwork(): bitcoin.Network {
    return this.network;
  }
}

export class BitcoinWallet implements ChainWallet {
  generateMnemonic(wordCount: 12 | 24): string {
    return generateMnemonic(wordCount);
  }

  validateMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic);
  }

  fromMnemonic(
    mnemonic: string,
    passphrase?: string,
    network?: string,
  ): BitcoinWalletInstance {
    const net = getNetwork(network);
    const seed = mnemonicToSeed(mnemonic, passphrase);
    const root = bip32.fromSeed(seed, net);
    return new BitcoinWalletInstance(root, net);
  }
}

export function validateDerivationPath(path: string): boolean {
  try {
    // Simple validation: must start with m/ or be a valid relative path
    if (!path.startsWith("m/") && path !== "m") return false;
    // Try parsing each component
    const parts = path.replace("m/", "").split("/");
    for (const part of parts) {
      if (part === "") continue;
      const num = part.endsWith("'")
        ? parseInt(part.slice(0, -1))
        : parseInt(part);
      if (isNaN(num) || num < 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}
