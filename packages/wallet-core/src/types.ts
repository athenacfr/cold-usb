export interface WalletInfo {
  network: string;
  fingerprint: string;
  createdAt: string;
  isLocked: boolean;
}

export interface AddressInfo {
  address: string;
  derivationPath: string;
  scriptType: string;
  publicKey: string;
}

export interface PSBTDetails {
  inputs: PSBTInput[];
  outputs: PSBTOutput[];
  fee: number;
  feeRate: number;
  totalInput: number;
  totalOutput: number;
}

export interface PSBTInput {
  txid: string;
  vout: number;
  amount: number;
  address: string | null;
}

export interface PSBTOutput {
  address: string;
  amount: number;
  isChange: boolean;
}

export interface SignedPSBTResult {
  signedPsbt: string;
  isFinalized: boolean;
  transactionHex: string | null;
}

export interface TransactionDetails {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  vsize: number;
  weight: number;
  inputs: TxInput[];
  outputs: TxOutput[];
}

export interface TxInput {
  txid: string;
  vout: number;
  scriptSig: string;
  witness: string[];
  sequence: number;
}

export interface TxOutput {
  value: number;
  scriptPubkey: string;
  address: string | null;
}

export interface WalletPayload {
  mnemonic: string;
  passphrase: string | null;
  network: string;
  fingerprint: string;
  createdAt: string;
  chain: string;
}
