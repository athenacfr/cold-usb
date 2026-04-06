import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { pack, unpack } from "msgpackr";
import { deriveKey, encrypt, decrypt, generateSalt } from "@coldusb/crypto";
import type { WalletPayload } from "@coldusb/wallet-core";

const WALLET_FILE_VERSION = 2;
const APP_DIR_NAME = "cold-usb";
const WALLET_FILENAME = "wallet.enc";

interface WalletFile {
  version: number;
  salt: Uint8Array;
  data: Uint8Array; // nonce + ciphertext + auth_tag
}

function getDataDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const platform = process.platform;

  if (platform === "darwin") {
    return join(home, "Library", "Application Support");
  } else if (platform === "win32") {
    return process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
  }
  // Linux / default
  return process.env.XDG_DATA_HOME ?? join(home, ".local", "share");
}

export function getWalletPath(): string {
  const dataDir = getDataDir();
  const appDir = join(dataDir, APP_DIR_NAME);

  if (!existsSync(appDir)) {
    mkdirSync(appDir, { recursive: true });
  }

  return join(appDir, WALLET_FILENAME);
}

export function walletExists(): boolean {
  try {
    return existsSync(getWalletPath());
  } catch {
    return false;
  }
}

export function deleteWallet(): void {
  const path = getWalletPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export async function saveWallet(
  payload: WalletPayload,
  password: string,
): Promise<void> {
  const salt = generateSalt();
  const key = await deriveKey(password, salt);

  // Serialize payload with msgpackr
  const payloadBytes = pack(payload);

  // Encrypt (returns nonce + ciphertext + tag)
  const encrypted = encrypt(new Uint8Array(payloadBytes), key);

  // Create wallet file envelope
  const walletFile: WalletFile = {
    version: WALLET_FILE_VERSION,
    salt,
    data: encrypted,
  };

  // Serialize envelope with msgpackr
  const fileBytes = pack(walletFile);

  // Write to disk
  const path = getWalletPath();
  writeFileSync(path, fileBytes);
}

export async function loadWallet(password: string): Promise<WalletPayload> {
  const path = getWalletPath();
  if (!existsSync(path)) {
    throw new Error("Wallet file not found");
  }

  // Read file
  const fileBytes = readFileSync(path);

  // Deserialize envelope
  const walletFile = unpack(fileBytes) as WalletFile;

  // Version check
  if (walletFile.version !== WALLET_FILE_VERSION) {
    throw new Error(
      `Unsupported wallet version: ${walletFile.version} (expected ${WALLET_FILE_VERSION})`,
    );
  }

  // Derive key from password + stored salt
  const key = await deriveKey(password, new Uint8Array(walletFile.salt));

  // Decrypt
  const payloadBytes = decrypt(new Uint8Array(walletFile.data), key);

  // Deserialize payload
  return unpack(Buffer.from(payloadBytes)) as WalletPayload;
}
