// Transaction-related types

export interface PSBTDetails {
  inputs: PSBTInput[];
  outputs: PSBTOutput[];
  fee: number;
  fee_rate: number;
  total_input: number;
  total_output: number;
}

export interface PSBTInput {
  txid: string;
  vout: number;
  amount: number;
  address?: string;
}

export interface PSBTOutput {
  address: string;
  amount: number;
  is_change: boolean;
}

export interface SignedPSBTResult {
  signed_psbt: string;
  is_finalized: boolean;
  transaction_hex?: string;
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
  script_sig: string;
  witness: string[];
  sequence: number;
}

export interface TxOutput {
  value: number;
  script_pubkey: string;
  address?: string;
}
