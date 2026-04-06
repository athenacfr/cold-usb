import { argon2id } from "hash-wasm";
import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";

// Argon2id parameters matching Rust implementation
const ARGON2_TIME_COST = 3;
const ARGON2_MEMORY_COST = 65536; // 64 MB
const ARGON2_PARALLELISM = 4;
const KEY_LENGTH = 32;

const NONCE_LENGTH = 12;
const SALT_LENGTH = 32;

/**
 * Derive encryption key from password using Argon2id.
 * Matches Rust: Argon2id v0x13, time=3, mem=64MB, parallel=4, output=32 bytes.
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const hash = await argon2id({
    password,
    salt,
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_TIME_COST,
    memorySize: ARGON2_MEMORY_COST,
    hashLength: KEY_LENGTH,
    outputType: "binary",
  });
  return hash;
}

/**
 * Encrypt data using AES-256-GCM.
 * Returns: nonce (12 bytes) + ciphertext + auth_tag (16 bytes).
 * Matches Rust encrypt() output format.
 */
export function encrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const nonce = randomBytes(NONCE_LENGTH);
  const aes = gcm(key, nonce);
  const ciphertext = aes.encrypt(data);

  // Combine nonce + ciphertext (ciphertext already includes auth tag from @noble/ciphers)
  const result = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  result.set(nonce, 0);
  result.set(ciphertext, NONCE_LENGTH);
  return result;
}

/**
 * Decrypt data using AES-256-GCM.
 * Expects: nonce (12 bytes) + ciphertext + auth_tag (16 bytes).
 */
export function decrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  if (data.length < NONCE_LENGTH + 16) {
    throw new Error("Encrypted data too short");
  }

  const nonce = data.slice(0, NONCE_LENGTH);
  const ciphertext = data.slice(NONCE_LENGTH);

  const aes = gcm(key, nonce);
  return aes.decrypt(ciphertext);
}

/**
 * Generate a random 32-byte salt.
 */
export function generateSalt(): Uint8Array {
  return randomBytes(SALT_LENGTH);
}
