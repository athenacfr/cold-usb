import { create } from 'zustand';

interface UIStore {
  // State
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;

  // Actions
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  isModalOpen: false,
  modalContent: null,

  // Actions
  openModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
}));
