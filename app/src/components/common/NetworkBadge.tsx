import React from 'react';

interface NetworkBadgeProps {
  network: 'mainnet' | 'testnet';
  className?: string;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ network, className = '' }) => {
  const isMainnet = network === 'mainnet';

  return (
    <span
      className={`
        inline-block px-3 py-1 text-xs font-mono uppercase font-bold
        ${isMainnet ? 'bg-alert-red text-hacker-white' : 'bg-bitcoin-orange text-hacker-black'}
        ${className}
      `}
    >
      {network}
    </span>
  );
};
