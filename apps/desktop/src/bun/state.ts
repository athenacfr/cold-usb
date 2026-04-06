import type { BitcoinWalletInstance } from "@coldusb/wallet-bitcoin";

interface UnlockedWallet {
  mnemonic: string;
  passphrase: string | null;
  network: string;
  fingerprint: string;
  instance: BitcoinWalletInstance;
}

class WalletState {
  private unlocked: UnlockedWallet | null = null;
  private lastActivity: Date = new Date();

  unlock(
    mnemonic: string,
    passphrase: string | null,
    network: string,
    fingerprint: string,
    instance: BitcoinWalletInstance,
  ): void {
    this.unlocked = { mnemonic, passphrase, network, fingerprint, instance };
    this.updateActivity();
  }

  lock(): void {
    // Clear sensitive data
    if (this.unlocked) {
      this.unlocked.mnemonic = "";
      this.unlocked = null;
    }
  }

  getUnlocked(): UnlockedWallet | null {
    return this.unlocked;
  }

  isUnlocked(): boolean {
    return this.unlocked !== null;
  }

  updateActivity(): void {
    this.lastActivity = new Date();
  }

  getLastActivity(): Date {
    return this.lastActivity;
  }
}

export const walletState = new WalletState();
