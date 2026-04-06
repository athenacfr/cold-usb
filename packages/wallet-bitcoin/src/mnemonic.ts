import * as bip39 from "bip39";

export function generateMnemonic(wordCount: 12 | 24): string {
  const strength = wordCount === 12 ? 128 : 256;
  return bip39.generateMnemonic(strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

export function getWordlist(): string[] {
  return bip39.wordlists.english;
}

export function mnemonicToSeed(
  mnemonic: string,
  passphrase?: string,
): Buffer {
  return bip39.mnemonicToSeedSync(mnemonic, passphrase ?? "");
}
