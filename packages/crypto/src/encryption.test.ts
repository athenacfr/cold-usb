import { describe, test, expect } from "bun:test";
import { deriveKey, encrypt, decrypt, generateSalt } from "./encryption";

describe("deriveKey", () => {
  test("produces 32-byte key", async () => {
    const salt = new Uint8Array(32).fill(1);
    const key = await deriveKey("test_password", salt);
    expect(key.length).toBe(32);
  });

  test("same password + salt = same key", async () => {
    const salt = new Uint8Array(32).fill(2);
    const key1 = await deriveKey("consistent", salt);
    const key2 = await deriveKey("consistent", salt);
    expect(key1).toEqual(key2);
  });

  test("different password = different key", async () => {
    const salt = new Uint8Array(32).fill(3);
    const key1 = await deriveKey("password1", salt);
    const key2 = await deriveKey("password2", salt);
    expect(key1).not.toEqual(key2);
  });
});

describe("encrypt/decrypt", () => {
  test("roundtrip", async () => {
    const salt = new Uint8Array(32).fill(4);
    const key = await deriveKey("test_password_123", salt);
    const data = new TextEncoder().encode("Hello, Bitcoin Cold Wallet!");

    const encrypted = encrypt(data, key);
    expect(encrypted.length).toBeGreaterThan(data.length);

    const decrypted = decrypt(encrypted, key);
    expect(decrypted).toEqual(data);
  });

  test("wrong key fails", async () => {
    const salt = new Uint8Array(32).fill(5);
    const key1 = await deriveKey("password1", salt);
    const key2 = await deriveKey("password2", salt);
    const data = new TextEncoder().encode("Secret data");

    const encrypted = encrypt(data, key1);
    expect(() => decrypt(encrypted, key2)).toThrow();
  });

  test("data too short throws", async () => {
    const salt = new Uint8Array(32).fill(6);
    const key = await deriveKey("pass", salt);
    expect(() => decrypt(new Uint8Array(10), key)).toThrow("Encrypted data too short");
  });
});

describe("generateSalt", () => {
  test("returns 32 bytes", () => {
    const salt = generateSalt();
    expect(salt.length).toBe(32);
  });

  test("different each time", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toEqual(salt2);
  });
});
