import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

/* Neo-brutalist buttons: nc-btn base (border + hard shadow + sink-on-press) */
const VARIANTS: Record<ButtonVariant, string> = {
  /* Lime fill — high-action CTA */
  primary:   'bg-[#C6F833] text-[#000]',
  /* Paper fill — secondary action */
  secondary: 'bg-[var(--paper2)] text-[var(--ink)]',
  /* Transparent — minimal */
  ghost:     'bg-transparent border-transparent shadow-none text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]',
  /* Red fill — destructive */
  danger:    'bg-[#FF5A47] text-[#000]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8  px-3 text-[10px] gap-1.5',
  md: 'h-10 px-4 text-[10px] gap-2',
  lg: 'h-13 px-5 text-[11px] gap-2',
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
      'nc-btn',
      'inline-flex items-center justify-center',
      'font-mono font-bold tracking-widest uppercase',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0',
      VARIANTS[variant],
      SIZES[size],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
    {children}
  </button>
);
