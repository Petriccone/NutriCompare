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

const VARIANTS: Record<BadgeVariant, string> = {
  high:
    'bg-lime-100 text-lime-700 border-lime-300 dark:bg-lime-950/40 dark:text-lime-400 dark:border-lime-700/40',
  medium:
    'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700/40',
  low:
    'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-700/40',
  winner:
    'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-600/30',
  tie:
    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/40',
  goal:
    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/40',
  disqualified:
    'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-700/40',
};

export const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border rounded ${VARIANTS[variant]} ${className}`}
  >
    {children}
  </span>
);
