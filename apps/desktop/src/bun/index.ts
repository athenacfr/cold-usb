import { BrowserWindow, BrowserView } from "electrobun/bun";
import type { ColdUSBRPC } from "../shared/rpc";
import {
  handleCreateWallet,
  handleImportWallet,
  handleUnlockWallet,
  handleLockWallet,
  handleWalletExists,
  handleGetWalletInfo,
  handleExportMnemonic,
  handleValidateMnemonic,
  handleGetBip39Wordlist,
  handleGenerateMnemonic,
  handleDeleteWallet,
  handleChangePassword,
  handleDeriveAddress,
  handleDeriveCustomAddress,
  handleDeriveAddresses,
  handleValidateDerivationPath,
  handleParsePsbt,
  handleSignPsbt,
  handleGetTransactionDetails,
  handleGenerateQr,
  handleGenerateQrCompressed,
  handleDecodeCompressedQr,
} from "./handlers";

async function getMainViewUrl(): Promise<string> {
  try {
    await fetch("http://localhost:5173", { method: "HEAD" });
    return "http://localhost:5173";
  } catch {
    return "views://mainview/index.html";
  }
}

const rpc = BrowserView.defineRPC<ColdUSBRPC>({
  maxRequestTime: 30000, // 30s for Argon2id operations
  handlers: {
    requests: {
      // Wallet
      createWallet: (params) => handleCreateWallet(params),
      importWallet: (params) => handleImportWallet(params),
      unlockWallet: (params) => handleUnlockWallet(params),
      lockWallet: () => handleLockWallet(),
      walletExists: () => handleWalletExists(),
      getWalletInfo: () => handleGetWalletInfo(),
      exportMnemonic: (params) => handleExportMnemonic(params),
      validateMnemonic: (params) => handleValidateMnemonic(params),
      getBip39Wordlist: () => handleGetBip39Wordlist(),
      generateMnemonic: (params) => handleGenerateMnemonic(params),
      deleteWallet: () => handleDeleteWallet(),
      changePassword: (params) => handleChangePassword(params),
      // Address
      deriveAddress: (params) => handleDeriveAddress(params),
      deriveCustomAddress: (params) => handleDeriveCustomAddress(params),
      deriveAddresses: (params) => handleDeriveAddresses(params),
      validateDerivationPath: (params) => handleValidateDerivationPath(params),
      // Transaction
      parsePsbt: (params) => handleParsePsbt(params),
      signPsbt: (params) => handleSignPsbt(params),
      getTransactionDetails: (params) => handleGetTransactionDetails(params),
      // QR
      generateQr: (params) => handleGenerateQr(params),
      generateQrCompressed: (params) => handleGenerateQrCompressed(params),
      decodeCompressedQr: (params) => handleDecodeCompressedQr(params),
    },
    messages: {},
  },
});

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: "Cold USB",
  url,
  rpc,
  frame: {
    width: 1280,
    height: 800,
    x: 100,
    y: 100,
  },
});
