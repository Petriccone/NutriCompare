import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent',
    'dark:bg-indigo-500 dark:hover:bg-indigo-400',
    'shadow-[0_0_16px_rgba(99,102,241,0.25)] hover:shadow-[0_0_24px_rgba(99,102,241,0.4)]',
  ].join(' '),

  secondary: [
    'bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100',
    'border-gray-200 dark:border-gray-700',
    'hover:border-indigo-300 dark:hover:border-indigo-600',
    'hover:text-indigo-700 dark:hover:text-indigo-400',
  ].join(' '),

  ghost: [
    'bg-transparent border-transparent',
    'text-gray-500 dark:text-gray-400',
    'hover:text-gray-900 dark:hover:text-gray-100',
    'hover:bg-gray-100 dark:hover:bg-gray-800/60',
  ].join(' '),

  danger: [
    'bg-rose-600 hover:bg-rose-500 text-white border-transparent',
    'dark:bg-rose-700 dark:hover:bg-rose-600',
  ].join(' '),
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8  px-3  text-[10px] gap-1.5',
  md: 'h-10 px-4  text-[10px] gap-2',
  lg: 'h-13 px-5  text-[10px] gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}) => (
  <button
    disabled={disabled}
    className={[
      'inline-flex items-center justify-center',
      'font-mono font-bold tracking-widest uppercase',
      'border rounded-xl',
      'transition-all duration-200 active:scale-[0.97]',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
      VARIANTS[variant],
      SIZES[size],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
  </button>
);
