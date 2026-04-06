import type { AddressInfo, PSBTDetails, SignedPSBTResult } from "./types";

export interface ChainWallet {
  generateMnemonic(wordCount: 12 | 24): string;
  validateMnemonic(mnemonic: string): boolean;
}

export interface WalletInstance {
  fingerprint(): string;
  deriveAddress(path: string): AddressInfo;
  deriveAddresses(account: number, change: number, startIndex: number, count: number): AddressInfo[];
}

export interface TransactionSigner {
  parsePSBT(data: string, format: "base64" | "hex"): PSBTDetails;
  signPSBT(data: string, format: "base64" | "hex"): SignedPSBTResult;
}
