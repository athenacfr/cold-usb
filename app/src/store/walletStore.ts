import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { WalletInfo } from '../types/wallet';

interface WalletStore {
  // State
  walletInfo: WalletInfo | null;
  isLocked: boolean;
  walletExists: boolean | null;

  // Actions
  setWalletInfo: (info: WalletInfo) => void;
  setLocked: (locked: boolean) => void;
  setWalletExists: (exists: boolean) => void;
  reset: () => void;

  // Wallet operations
  checkWalletExists: () => Promise<boolean>;
  createWallet: (wordCount: number, passphrase: string | null, password: string, network: string) => Promise<WalletInfo>;
  importWallet: (mnemonic: string, passphrase: string | null, password: string, network: string) => Promise<WalletInfo>;
  unlockWallet: (password: string) => Promise<WalletInfo>;
  lockWallet: () => Promise<void>;
  deleteWallet: () => Promise<void>;
  exportMnemonic: (password: string) => Promise<string>;
  validateMnemonic: (mnemonic: string) => Promise<boolean>;
  getBip39Wordlist: () => Promise<string[]>;
}

export const useWalletStore = create<WalletStore>((set) => ({
  // Initial state
  walletInfo: null,
  isLocked: true,
  walletExists: null,

  // Actions
  setWalletInfo: (info) => set({ walletInfo: info, isLocked: info.is_locked }),
  setLocked: (locked) => set({ isLocked: locked }),
  setWalletExists: (exists) => set({ walletExists: exists }),
  reset: () => set({ walletInfo: null, isLocked: true, walletExists: null }),

  // Wallet operations
  checkWalletExists: async () => {
    const exists = await invoke<boolean>('wallet_exists');
    set({ walletExists: exists });
    return exists;
  },

  createWallet: async (wordCount, passphrase, password, network) => {
    const info = await invoke<WalletInfo>('create_wallet', {
      wordCount,
      passphrase,
      password,
      network,
    });
    set({ walletInfo: info, isLocked: false, walletExists: true });
    return info;
  },

  importWallet: async (mnemonic, passphrase, password, network) => {
    const info = await invoke<WalletInfo>('import_wallet', {
      mnemonic,
      passphrase,
      password,
      network,
    });
    set({ walletInfo: info, isLocked: false, walletExists: true });
    return info;
  },

  unlockWallet: async (password) => {
    const info = await invoke<WalletInfo>('unlock_wallet', { password });
    set({ walletInfo: info, isLocked: false });
    return info;
  },

  lockWallet: async () => {
    await invoke('lock_wallet');
    set({ isLocked: true });
  },

  deleteWallet: async () => {
    await invoke('delete_wallet');
    set({ walletInfo: null, isLocked: true, walletExists: false });
  },

  exportMnemonic: async (password) => {
    return await invoke<string>('export_mnemonic', { password });
  },

  validateMnemonic: async (mnemonic) => {
    return await invoke<boolean>('validate_mnemonic', { mnemonic });
  },

  getBip39Wordlist: async () => {
    return await invoke<string[]>('get_bip39_wordlist');
  },
}));
