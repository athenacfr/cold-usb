import React from 'react';
import { X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface CloseButtonProps {
  className?: string;
}

export const CloseButton: React.FC<CloseButtonProps> = ({ className = '' }) => {
  return (
    <button
      onClick={() => getCurrentWindow().close()}
      className={`fixed top-4 right-4 p-2 text-muted-gray hover:text-hacker-white hover:bg-muted-gray/20 transition-colors rounded ${className}`}
      title="Close application"
    >
      <X className="w-6 h-6" />
    </button>
  );
};
