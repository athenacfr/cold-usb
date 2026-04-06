import React from 'react';
import { Lock } from 'lucide-react';
import { useWindowFocus } from '../../hooks/useWindowFocus';
import { useWalletStore } from '../../store/walletStore';

export const PrivacyOverlay: React.FC = () => {
  const isFocused = useWindowFocus();
  const { isLocked } = useWalletStore();

  // Don't show overlay if wallet is locked (nothing sensitive to hide)
  // or if window is focused
  if (isLocked || isFocused) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-xl bg-hacker-black/80 flex items-center justify-center">
      <div className="text-center">
        <Lock className="w-16 h-16 text-bitcoin-orange mx-auto mb-4" />
        <p className="text-hacker-white font-mono text-xl">
          Screen Hidden for Privacy
        </p>
        <p className="text-muted-gray font-mono text-sm mt-2">
          Click to reveal
        </p>
      </div>
    </div>
  );
};
