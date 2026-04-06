import type { RPCSchema } from "electrobun";
import type {
  WalletInfo,
  AddressInfo,
  PSBTDetails,
  SignedPSBTResult,
  TransactionDetails,
} from "@coldusb/wallet-core";

export type ColdUSBRPC = {
  bun: RPCSchema<{
    requests: {
      // Wallet management
      createWallet: {
        params: {
          wordCount: number;
          passphrase: string | null;
          password: string;
          network: string;
        };
        response: WalletInfo;
      };
      importWallet: {
        params: {
          mnemonic: string;
          passphrase: string | null;
          password: string;
          network: string;
        };
        response: WalletInfo;
      };
      unlockWallet: {
        params: { password: string };
        response: WalletInfo;
      };
      lockWallet: {
        params: Record<string, never>;
        response: void;
      };
      walletExists: {
        params: Record<string, never>;
        response: boolean;
      };
      getWalletInfo: {
        params: Record<string, never>;
        response: WalletInfo;
      };
      exportMnemonic: {
        params: { password: string };
        response: string;
      };
      validateMnemonic: {
        params: { mnemonic: string };
        response: boolean;
      };
      getBip39Wordlist: {
        params: Record<string, never>;
        response: string[];
      };
      generateMnemonic: {
        params: { wordCount: number };
        response: string;
      };
      deleteWallet: {
        params: Record<string, never>;
        response: void;
      };
      changePassword: {
        params: { oldPassword: string; newPassword: string };
        response: void;
      };

      // Address operations
      deriveAddress: {
        params: { account: number; change: number; index: number };
        response: AddressInfo;
      };
      deriveCustomAddress: {
        params: { derivationPath: string };
        response: AddressInfo;
      };
      deriveAddresses: {
        params: {
          account: number;
          change: number;
          startIndex: number;
          count: number;
        };
        response: AddressInfo[];
      };
      validateDerivationPath: {
        params: { path: string };
        response: boolean;
      };

      // Transaction operations
      parsePsbt: {
        params: { psbtData: string; format: string };
        response: PSBTDetails;
      };
      signPsbt: {
        params: { psbtData: string; format: string };
        response: SignedPSBTResult;
      };
      getTransactionDetails: {
        params: { psbtData: string; format: string };
        response: TransactionDetails;
      };

      // QR operations
      generateQr: {
        params: { data: string; size: number };
        response: string;
      };
      generateQrCompressed: {
        params: { data: string; size: number; compress: boolean };
        response: string;
      };
      decodeCompressedQr: {
        params: { data: string };
        response: string;
      };

      // Window operations
      closeWindow: {
        params: Record<string, never>;
        response: void;
      };
    };
    messages: Record<string, never>;
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: Record<string, never>;
  }>;
};
