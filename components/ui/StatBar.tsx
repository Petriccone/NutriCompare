import React from 'react';

interface StatBarProps {
  label: string;
  value: number | null;
  unit: string;
  points: number;
  maxPoints: number;
  note?: string;
  /** When true, higher score pct means a good (lime) bar; when false, rose */
  className?: string;
}

function barColor(pct: number): string {
  if (pct >= 70) return 'bg-lime-400 dark:bg-lime-500';
  if (pct >= 35) return 'bg-amber-400 dark:bg-amber-500';
  return 'bg-rose-400 dark:bg-rose-500';
}

/**
 * Single-product score bar row.
 * Used in summary views; ScoreBreakdown uses its own paired layout.
 */
export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  unit,
  points,
  maxPoints,
  note,
  className = '',
}) => {
  const pct = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
  const color = barColor(pct);

  return (
    <div className={`py-2.5 ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {value !== null ? (
            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {value}&thinsp;{unit}
            </span>
          ) : (
            <span className="text-xs italic text-gray-400 dark:text-gray-600">n/d</span>
          )}
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-600">
            {points}/{maxPoints}
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`nc-score-bar h-full rounded-full ${color}`}
          style={{ '--nc-fill-w': `${pct}%` } as React.CSSProperties}
        />
      </div>

      {note && (
        <p className="mt-1 text-[10px] italic text-gray-400 dark:text-gray-600">{note}</p>
      )}
    </div>
  );
};
