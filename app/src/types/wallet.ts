// Wallet-related types

export interface WalletInfo {
  network: string;
  fingerprint: string;
  created_at: string;
  is_locked: boolean;
}

export interface AddressInfo {
  address: string;
  derivation_path: string;
  script_type: string;
  public_key: string;
}

export type NetworkType = 'mainnet' | 'testnet';
