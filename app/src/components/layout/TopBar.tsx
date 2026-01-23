import React from 'react';
import { Lock, LockOpen, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Button } from '../common/Button';

interface TopBarProps {
  isLocked: boolean;
  onLock: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isLocked, onLock }) => {
  return (
    <div className="border-b border-muted-gray px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-bitcoin-orange text-2xl font-bold">[$]</span>
        <h1 className="text-hacker-white font-mono uppercase text-xl font-bold">
          Cold USB Wallet
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onLock}
          disabled={isLocked}
          className="flex items-center gap-2"
        >
          {isLocked ? (
            <>
              <Lock className="w-4 h-4" />
              Locked
            </>
          ) : (
            <>
              <LockOpen className="w-4 h-4" />
              Lock
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => getCurrentWindow().close()}
          className="flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Close
        </Button>
      </div>
    </div>
  );
};
