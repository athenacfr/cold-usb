import { describe, test, expect } from "bun:test";
import {
  BitcoinWallet,
  validateDerivationPath,
} from "./wallet";
import {
  generateMnemonic,
  validateMnemonic,
  getWordlist,
} from "./mnemonic";

const TEST_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

const wallet = new BitcoinWallet();

describe("mnemonic", () => {
  test("generate 12-word mnemonic", () => {
    const m = generateMnemonic(12);
    const words = m.split(" ");
    expect(words.length).toBe(12);
    expect(validateMnemonic(m)).toBe(true);
  });

  test("generate 24-word mnemonic", () => {
    const m = generateMnemonic(24);
    const words = m.split(" ");
    expect(words.length).toBe(24);
    expect(validateMnemonic(m)).toBe(true);
  });

  test("validate valid mnemonic", () => {
    expect(validateMnemonic(TEST_MNEMONIC)).toBe(true);
  });

  test("validate invalid mnemonic", () => {
    expect(validateMnemonic("invalid mnemonic phrase")).toBe(false);
  });

  test("wordlist has 2048 words", () => {
    const wl = getWordlist();
    expect(wl.length).toBe(2048);
    expect(wl).toContain("abandon");
    expect(wl).toContain("zoo");
  });
});

describe("HD wallet", () => {
  test("create from mnemonic", () => {
    const instance = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "testnet");
    expect(instance.fingerprint().length).toBe(8);
  });

  test("deterministic fingerprint", () => {
    const w1 = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    const w2 = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    expect(w1.fingerprint()).toBe(w2.fingerprint());
  });

  test("passphrase changes fingerprint", () => {
    const w1 = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    const w2 = wallet.fromMnemonic(TEST_MNEMONIC, "password", "bitcoin");
    expect(w1.fingerprint()).not.toBe(w2.fingerprint());
  });

  test("derive BIP84 address (P2WPKH) - testnet", () => {
    const instance = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "testnet");
    const addr = instance.deriveBIP84Address(0, 0, 0);
    expect(addr.address.startsWith("tb1q")).toBe(true);
    expect(addr.scriptType).toBe("p2wpkh");
    expect(addr.derivationPath).toBe("m/84'/1'/0'/0/0");
    expect(addr.publicKey.length).toBeGreaterThan(0);
  });

  test("derive BIP84 address (P2WPKH) - mainnet", () => {
    const instance = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    const addr = instance.deriveBIP84Address(0, 0, 0);
    expect(addr.address.startsWith("bc1q")).toBe(true);
  });

  test("derive BIP86 address (P2TR) - testnet", () => {
    const instance = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "testnet");
    const addr = instance.deriveBIP86Address(0, 0, 0);
    expect(addr.address.startsWith("tb1p")).toBe(true);
    expect(addr.scriptType).toBe("p2tr");
    expect(addr.derivationPath).toBe("m/86'/1'/0'/0/0");
  });

  test("derive BIP86 address (P2TR) - mainnet", () => {
    const instance = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    const addr = instance.deriveBIP86Address(0, 0, 0);
    expect(addr.address.startsWith("bc1p")).toBe(true);
  });

  test("deriveAddresses batch", () => {
    const instance = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "testnet");
    const addrs = instance.deriveAddresses(0, 0, 0, 5);
    expect(addrs.length).toBe(5);
    // Each should be unique
    const unique = new Set(addrs.map((a) => a.address));
    expect(unique.size).toBe(5);
  });

  test("deterministic addresses", () => {
    const w1 = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    const w2 = wallet.fromMnemonic(TEST_MNEMONIC, undefined, "bitcoin");
    const a1 = w1.deriveBIP84Address(0, 0, 0);
    const a2 = w2.deriveBIP84Address(0, 0, 0);
    expect(a1.address).toBe(a2.address);
    expect(a1.publicKey).toBe(a2.publicKey);
  });
});

describe("validateDerivationPath", () => {
  test("valid paths", () => {
    expect(validateDerivationPath("m/44'/0'/0'/0/0")).toBe(true);
    expect(validateDerivationPath("m/84'/0'/0'/0/0")).toBe(true);
    expect(validateDerivationPath("m/86'/0'/0'/0/0")).toBe(true);
    expect(validateDerivationPath("m/0")).toBe(true);
  });

  test("invalid paths", () => {
    expect(validateDerivationPath("invalid/path")).toBe(false);
    expect(validateDerivationPath("")).toBe(false);
    expect(validateDerivationPath("44'/0'/0'")).toBe(false);
  });
});
