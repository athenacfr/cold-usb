import { generateMnemonic as generate, validateMnemonic as validate, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

export function generateMnemonic(wordCount: 12 | 24): string {
  const strength = wordCount === 12 ? 128 : 256;
  return generate(wordlist, strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return validate(mnemonic, wordlist);
}

export function getWordlist(): string[] {
  return [...wordlist];
}

export function mnemonicToSeed(mnemonic: string, passphrase?: string): Uint8Array {
  return mnemonicToSeedSync(mnemonic, passphrase ?? "");
}
