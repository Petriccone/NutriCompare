import React from 'react';

export type BadgeVariant =
  | 'high'
  | 'medium'
  | 'low'
  | 'winner'
  | 'tie'
  | 'goal'
  | 'disqualified';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

/* Neo-brutalist badges: flat fill + 2px black border. No soft shadows, no glass. */
const VARIANTS: Record<BadgeVariant, string> = {
  /* Confidence badges */
  high:         'bg-[#C6F833] text-[#000] border-[var(--ink)]',
  medium:       'bg-[#FFD23F] text-[#000] border-[var(--ink)]',
  low:          'bg-[#FF5A47] text-[#000] border-[var(--ink)]',
  /* Outcome badges */
  winner:       'bg-[#C6F833] text-[#000] border-[var(--ink)]',
  tie:          'bg-[#FFD23F] text-[#000] border-[var(--ink)]',
  disqualified: 'bg-[#FF5A47] text-[#000] border-[var(--ink)]',
  /* Goal / meta */
  goal:         'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]',
};

export const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => (
  <span
    className={[
      'inline-flex items-center gap-1',
      'px-2 py-0.5',
      'text-[10px] font-mono font-bold uppercase tracking-widest',
      'border-2',
      VARIANTS[variant],
      className,
    ].join(' ')}
  >
    {children}
  </span>
);
