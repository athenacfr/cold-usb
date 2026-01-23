import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-hacker-black/90"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-hacker-black border-2 border-bitcoin-orange p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up">
        {title && (
          <h2 className="text-2xl font-mono uppercase font-bold text-bitcoin-orange mb-6">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};
