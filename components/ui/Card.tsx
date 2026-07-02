import React from 'react';

type GlowColor = 'lime' | 'indigo' | 'rose' | 'amber' | 'none';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: GlowColor;
  /** 'glass' is legacy — no-op in DUELO POP (glass/blur is banned) */
  variant?: 'default' | 'glass';
}

/* Neo-brutalist card: nc-box (3px border + 6px hard shadow). No rounded corners.
   The `glow` prop is kept for API compatibility but unused — no soft shadows.      */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  // glow and variant kept for prop compatibility; both are no-ops in new design
  glow: _glow = 'none',
  variant: _variant = 'default',
}) => (
  <div
    className={[
      'nc-box',
      'bg-[var(--paper2)]',
      'overflow-hidden',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </div>
);
