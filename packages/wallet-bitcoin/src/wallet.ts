import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import type {
  AddressInfo,
  WalletInstance,
  ChainWallet,
} from "@coldusb/wallet-core";
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from "./mnemonic";

const MAINNET: btc.BTC_NETWORK = {
  bech32: "bc",
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

const TESTNET: btc.BTC_NETWORK = {
  bech32: "tb",
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

const REGTEST: btc.BTC_NETWORK = {
  bech32: "bcrt",
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

function getNetwork(network?: string): btc.BTC_NETWORK {
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

function getCoinType(network: btc.BTC_NETWORK): number {
  return network.bech32 === "bc" ? 0 : 1;
}

export class BitcoinWalletInstance implements WalletInstance {
  private root: HDKey;
  private network: btc.BTC_NETWORK;
  private networkName: string;

  constructor(root: HDKey, network: btc.BTC_NETWORK, networkName: string) {
    this.root = root;
    this.network = network;
    this.networkName = networkName;
  }

  fingerprint(): string {
    // HDKey.fingerprint is a number (4 bytes) — convert to 8-char hex
    const fp = this.root.fingerprint;
    return fp.toString(16).padStart(8, "0");
  }

  deriveAddress(path: string): AddressInfo {
    const child = this.root.derive(path);
    const pubkey = child.publicKey!;
    const scriptType = path.startsWith("m/86'") ? "p2tr" : "p2wpkh";

    if (scriptType === "p2tr") {
      // p2tr needs 32-byte x-only pubkey
      const xOnly = pubkey.slice(1);
      const payment = btc.p2tr(xOnly, undefined, this.network);
      return {
        address: payment.address!,
        derivationPath: path,
        scriptType: "p2tr",
        publicKey: hex.encode(pubkey),
      };
    }

    const payment = btc.p2wpkh(pubkey, this.network);
    return {
      address: payment.address!,
      derivationPath: path,
      scriptType: "p2wpkh",
      publicKey: hex.encode(pubkey),
    };
  }

  deriveAddresses(
    account: number,
    change: number,
    startIndex: number,
    count: number,
  ): AddressInfo[] {
    const addresses: AddressInfo[] = [];
    for (let i = 0; i < count; i++) {
      const path = this.bip84Path(account, change, startIndex + i);
      addresses.push(this.deriveAddress(path));
    }
    return addresses;
  }

  deriveBIP84Address(account: number, change: number, index: number): AddressInfo {
    return this.deriveAddress(this.bip84Path(account, change, index));
  }

  deriveBIP86Address(account: number, change: number, index: number): AddressInfo {
    return this.deriveAddress(this.bip86Path(account, change, index));
  }

  bip84Path(account: number, change: number, index: number): string {
    const coin = getCoinType(this.network);
    return `m/84'/${coin}'/${account}'/${change}/${index}`;
  }

  bip86Path(account: number, change: number, index: number): string {
    const coin = getCoinType(this.network);
    return `m/86'/${coin}'/${account}'/${change}/${index}`;
  }

  getRoot(): HDKey {
    return this.root;
  }

  getNetwork(): btc.BTC_NETWORK {
    return this.network;
  }

  getNetworkName(): string {
    return this.networkName;
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
    const root = HDKey.fromMasterSeed(seed);
    return new BitcoinWalletInstance(root, net, network ?? "bitcoin");
  }
}

export function validateDerivationPath(path: string): boolean {
  try {
    if (!path.startsWith("m/") && path !== "m") return false;
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
