import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'px-6 py-3 font-mono uppercase transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'border-2 border-bitcoin-orange text-hacker-white hover:bg-bitcoin-orange/10 hover:glow-orange',
    secondary: 'border-2 border-muted-gray text-hacker-white hover:border-hacker-white',
    danger: 'border-2 border-alert-red text-hacker-white hover:bg-alert-red/10',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
