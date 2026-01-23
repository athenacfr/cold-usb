import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-hacker-black border border-muted-gray p-6 ${className}`}>
      {title && (
        <h3 className="text-bitcoin-orange font-mono uppercase font-bold mb-4 text-lg">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
