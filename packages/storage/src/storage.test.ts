import { describe, test, expect, beforeEach } from "bun:test";
import { existsSync, unlinkSync } from "fs";
import {
  saveWallet,
  loadWallet,
  walletExists,
  deleteWallet,
  getWalletPath,
} from "./storage";
import type { WalletPayload } from "@coldusb/wallet-core";

function cleanup() {
  try {
    const path = getWalletPath();
    if (existsSync(path)) unlinkSync(path);
  } catch {}
}

beforeEach(cleanup);

const testPayload: WalletPayload = {
  mnemonic:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  passphrase: null,
  network: "testnet",
  fingerprint: "73c5da0a",
  createdAt: new Date().toISOString(),
  chain: "bitcoin",
};

describe("getWalletPath", () => {
  test("returns path containing cold-usb", () => {
    const path = getWalletPath();
    expect(path).toContain("cold-usb");
    expect(path).toEndWith("wallet.enc");
  });
});

describe("walletExists", () => {
  test("returns false when no wallet", () => {
    expect(walletExists()).toBe(false);
  });
});

describe("save/load roundtrip", () => {
  test("saves and loads wallet", async () => {
    const password = "test_password_123";

    await saveWallet(testPayload, password);
    expect(walletExists()).toBe(true);

    const loaded = await loadWallet(password);
    expect(loaded.mnemonic).toBe(testPayload.mnemonic);
    expect(loaded.passphrase).toBe(testPayload.passphrase);
    expect(loaded.network).toBe(testPayload.network);
    expect(loaded.fingerprint).toBe(testPayload.fingerprint);
    expect(loaded.chain).toBe(testPayload.chain);

    cleanup();
  });

  test("wrong password fails", async () => {
    await saveWallet(testPayload, "correct_password");
    expect(loadWallet("wrong_password")).rejects.toThrow();
    cleanup();
  });

  test("load nonexistent wallet fails", async () => {
    expect(loadWallet("any")).rejects.toThrow("Wallet file not found");
  });
});

describe("deleteWallet", () => {
  test("removes wallet file", async () => {
    await saveWallet(testPayload, "password");
    expect(walletExists()).toBe(true);
    deleteWallet();
    expect(walletExists()).toBe(false);
  });
});
