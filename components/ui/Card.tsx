import React from 'react';

type GlowColor = 'lime' | 'indigo' | 'rose' | 'amber' | 'none';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: GlowColor;
  /** 'glass' adds backdrop-blur frosted effect */
  variant?: 'default' | 'glass';
}

const GLOW: Record<GlowColor, string> = {
  lime:   'shadow-[0_0_28px_rgba(163,230,53,0.16)] dark:shadow-[0_0_28px_rgba(163,230,53,0.10)]',
  indigo: 'shadow-[0_0_28px_rgba(99,102,241,0.18)] dark:shadow-[0_0_28px_rgba(129,140,248,0.12)]',
  rose:   'shadow-[0_0_28px_rgba(244,63,94,0.16)] dark:shadow-[0_0_28px_rgba(244,63,94,0.10)]',
  amber:  'shadow-[0_0_28px_rgba(245,158,11,0.16)] dark:shadow-[0_0_28px_rgba(245,158,11,0.10)]',
  none:   '',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = 'none',
  variant = 'default',
}) => {
  const base =
    variant === 'glass'
      ? 'nc-glass border border-white/40 dark:border-white/5'
      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800';

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-shadow duration-300 ${base} ${GLOW[glow]} ${className}`}
    >
      {children}
    </div>
  );
};
