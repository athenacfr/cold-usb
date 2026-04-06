import { create } from 'zustand';
import { rpc } from '../bridge';
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
  setWalletInfo: (info) => set({ walletInfo: info, isLocked: info.isLocked }),
  setLocked: (locked) => set({ isLocked: locked }),
  setWalletExists: (exists) => set({ walletExists: exists }),
  reset: () => set({ walletInfo: null, isLocked: true, walletExists: null }),

  // Wallet operations
  checkWalletExists: async () => {
    const exists = await rpc.request.walletExists({});
    set({ walletExists: exists });
    return exists;
  },

  createWallet: async (wordCount, passphrase, password, network) => {
    const info = await rpc.request.createWallet({
      wordCount,
      passphrase,
      password,
      network,
    });
    set({ walletInfo: info, isLocked: false, walletExists: true });
    return info;
  },

  importWallet: async (mnemonic, passphrase, password, network) => {
    const info = await rpc.request.importWallet({
      mnemonic,
      passphrase,
      password,
      network,
    });
    set({ walletInfo: info, isLocked: false, walletExists: true });
    return info;
  },

  unlockWallet: async (password) => {
    const info = await rpc.request.unlockWallet({ password });
    set({ walletInfo: info, isLocked: false });
    return info;
  },

  lockWallet: async () => {
    await rpc.request.lockWallet({});
    set({ isLocked: true });
  },

  deleteWallet: async () => {
    await rpc.request.deleteWallet({});
    set({ walletInfo: null, isLocked: true, walletExists: false });
  },

  exportMnemonic: async (password) => {
    return await rpc.request.exportMnemonic({ password });
  },

  validateMnemonic: async (mnemonic) => {
    return await rpc.request.validateMnemonic({ mnemonic });
  },

  getBip39Wordlist: async () => {
    return await rpc.request.getBip39Wordlist({});
  },
}));
