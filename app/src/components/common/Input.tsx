import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-mono text-hacker-white mb-2 uppercase">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-hacker-black border text-hacker-white
          px-4 py-2 font-mono outline-none transition-colors
          ${error ? 'border-alert-red' : 'border-muted-gray focus:border-bitcoin-orange'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-alert-red text-sm font-mono mt-1">
          {error}
        </p>
      )}
    </div>
  );
};
