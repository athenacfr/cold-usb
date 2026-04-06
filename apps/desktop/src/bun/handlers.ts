import {
  BitcoinWallet,
  generateMnemonic,
  validateMnemonic,
  getWordlist,
  validateDerivationPath,
  parsePSBT,
  signPSBT,
  getTransactionDetails,
} from "@coldusb/wallet-bitcoin";
import {
  saveWallet,
  loadWallet,
  walletExists,
  deleteWallet,
} from "@coldusb/storage";
import type {
  WalletInfo,
  AddressInfo,
  PSBTDetails,
  SignedPSBTResult,
  TransactionDetails,
  WalletPayload,
} from "@coldusb/wallet-core";
import { walletState } from "./state";

const btcWallet = new BitcoinWallet();

function requireUnlocked() {
  const unlocked = walletState.getUnlocked();
  if (!unlocked) throw new Error("Wallet is locked");
  return unlocked;
}

// --- Wallet handlers ---

export async function handleCreateWallet(params: {
  wordCount: number;
  passphrase: string | null;
  password: string;
  network: string;
}): Promise<WalletInfo> {
  const { wordCount, passphrase, password, network } = params;

  if (wordCount !== 12 && wordCount !== 24) {
    throw new Error("Word count must be 12 or 24");
  }

  const mnemonic = generateMnemonic(wordCount as 12 | 24);
  const instance = btcWallet.fromMnemonic(mnemonic, passphrase ?? undefined, network);
  const fingerprint = instance.fingerprint();
  const createdAt = new Date().toISOString();

  const payload: WalletPayload = {
    mnemonic,
    passphrase,
    network,
    fingerprint,
    createdAt,
    chain: "bitcoin",
  };

  await saveWallet(payload, password);
  walletState.unlock(mnemonic, passphrase, network, fingerprint, instance);

  return { network, fingerprint, createdAt, isLocked: false };
}

export async function handleImportWallet(params: {
  mnemonic: string;
  passphrase: string | null;
  password: string;
  network: string;
}): Promise<WalletInfo> {
  const { mnemonic, passphrase, password, network } = params;

  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }

  const instance = btcWallet.fromMnemonic(mnemonic, passphrase ?? undefined, network);
  const fingerprint = instance.fingerprint();
  const createdAt = new Date().toISOString();

  const payload: WalletPayload = {
    mnemonic,
    passphrase,
    network,
    fingerprint,
    createdAt,
    chain: "bitcoin",
  };

  await saveWallet(payload, password);
  walletState.unlock(mnemonic, passphrase, network, fingerprint, instance);

  return { network, fingerprint, createdAt, isLocked: false };
}

export async function handleUnlockWallet(params: {
  password: string;
}): Promise<WalletInfo> {
  const payload = await loadWallet(params.password);
  const instance = btcWallet.fromMnemonic(
    payload.mnemonic,
    payload.passphrase ?? undefined,
    payload.network,
  );

  walletState.unlock(
    payload.mnemonic,
    payload.passphrase,
    payload.network,
    payload.fingerprint,
    instance,
  );

  return {
    network: payload.network,
    fingerprint: payload.fingerprint,
    createdAt: payload.createdAt,
    isLocked: false,
  };
}

export function handleLockWallet(): void {
  walletState.lock();
}

export function handleWalletExists(): boolean {
  return walletExists();
}

export function handleGetWalletInfo(): WalletInfo {
  const unlocked = requireUnlocked();
  return {
    network: unlocked.network,
    fingerprint: unlocked.fingerprint,
    createdAt: "", // not available without re-reading file
    isLocked: false,
  };
}

export async function handleExportMnemonic(params: {
  password: string;
}): Promise<string> {
  requireUnlocked();
  // Verify password by loading wallet
  const payload = await loadWallet(params.password);
  walletState.updateActivity();
  return payload.mnemonic;
}

export function handleValidateMnemonic(params: {
  mnemonic: string;
}): boolean {
  return validateMnemonic(params.mnemonic);
}

export function handleGetBip39Wordlist(): string[] {
  return getWordlist();
}

export function handleGenerateMnemonic(params: {
  wordCount: number;
}): string {
  if (params.wordCount !== 12 && params.wordCount !== 24) {
    throw new Error("Word count must be 12 or 24");
  }
  return generateMnemonic(params.wordCount as 12 | 24);
}

export function handleDeleteWallet(): void {
  walletState.lock();
  deleteWallet();
}

export async function handleChangePassword(params: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> {
  requireUnlocked();
  const payload = await loadWallet(params.oldPassword);
  await saveWallet(payload, params.newPassword);
  walletState.updateActivity();
}

// --- Address handlers ---

export function handleDeriveAddress(params: {
  account: number;
  change: number;
  index: number;
}): AddressInfo {
  const unlocked = requireUnlocked();
  const addr = unlocked.instance.deriveBIP84Address(
    params.account,
    params.change,
    params.index,
  );
  walletState.updateActivity();
  return addr;
}

export function handleDeriveCustomAddress(params: {
  derivationPath: string;
}): AddressInfo {
  const unlocked = requireUnlocked();
  const addr = unlocked.instance.deriveAddress(params.derivationPath);
  walletState.updateActivity();
  return addr;
}

export function handleDeriveAddresses(params: {
  account: number;
  change: number;
  startIndex: number;
  count: number;
}): AddressInfo[] {
  if (params.count > 100) throw new Error("Count cannot exceed 100");
  const unlocked = requireUnlocked();
  const addrs = unlocked.instance.deriveAddresses(
    params.account,
    params.change,
    params.startIndex,
    params.count,
  );
  walletState.updateActivity();
  return addrs;
}

export function handleValidateDerivationPath(params: {
  path: string;
}): boolean {
  return validateDerivationPath(params.path);
}

// --- Transaction handlers ---

export function handleParsePsbt(params: {
  psbtData: string;
  format: string;
}): PSBTDetails {
  const unlocked = requireUnlocked();
  walletState.updateActivity();
  return parsePSBT(params.psbtData, params.format, unlocked.network);
}

export function handleSignPsbt(params: {
  psbtData: string;
  format: string;
}): SignedPSBTResult {
  const unlocked = requireUnlocked();
  walletState.updateActivity();
  return signPSBT(params.psbtData, params.format, unlocked.instance);
}

export function handleGetTransactionDetails(params: {
  psbtData: string;
  format: string;
}): TransactionDetails {
  return getTransactionDetails(params.psbtData, params.format);
}

// --- QR handlers ---

export function handleGenerateQr(params: {
  data: string;
  size: number;
}): string {
  // QR generation is now frontend-only via qrcode.react
  // This handler exists for API compatibility but returns raw data
  // The frontend renders QR codes directly
  return params.data;
}

export function handleGenerateQrCompressed(params: {
  data: string;
  size: number;
  compress: boolean;
}): string {
  if (!params.compress || params.data.length <= 100) {
    return btoa(params.data);
  }

  // Bun has built-in gzip support
  const compressed = Bun.gzipSync(Buffer.from(params.data));
  if (compressed.length < params.data.length) {
    const prefixed = Buffer.concat([Buffer.from("C:"), compressed]);
    return btoa(String.fromCharCode(...prefixed));
  }
  return btoa(params.data);
}

export function handleDecodeCompressedQr(params: {
  data: string;
}): string {
  const decoded = Buffer.from(params.data, "base64");

  if (decoded.length > 2 && decoded[0] === 0x43 && decoded[1] === 0x3a) {
    // "C:" prefix — decompress
    const compressed = decoded.subarray(2);
    const decompressed = Bun.gunzipSync(compressed);
    return new TextDecoder().decode(decompressed);
  }

  return decoded.toString("utf-8");
}
