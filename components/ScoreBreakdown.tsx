import React from 'react';
import { GoalScore, ScoreLine } from '../types';
import { AlertOctagon } from 'lucide-react';
import { Card } from './ui/Card';

interface ScoreBreakdownProps {
  scoreA: GoalScore;
  scoreB: GoalScore;
  productAName: string;
  productBName: string;
}

/* Map score percentage to a bar fill colour */
function barColor(pct: number): string {
  if (pct >= 70) return 'bg-lime-400 dark:bg-lime-500';
  if (pct >= 35) return 'bg-amber-400 dark:bg-amber-500';
  return 'bg-rose-400 dark:bg-rose-500';
}

/* ── Paired criterion row ─────────────────────────────────────────────────── */
interface PairedRowProps {
  lineA: ScoreLine;
  lineB: ScoreLine;
}

const PairedRow: React.FC<PairedRowProps> = ({ lineA, lineB }) => {
  const pctA = lineA.maxPoints > 0 ? (lineA.points / lineA.maxPoints) * 100 : 0;
  const pctB = lineB.maxPoints > 0 ? (lineB.points / lineB.maxPoints) * 100 : 0;

  const aWins = lineA.points > lineB.points;
  const bWins = lineB.points > lineA.points;

  const formatVal = (line: ScoreLine) =>
    line.value !== null ? `${line.value} ${line.unit}` : '—';

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {lineA.label}
        </span>
        <span className="text-[9px] font-mono text-gray-300 dark:text-gray-600">
          máx {lineA.maxPoints}pt
        </span>
      </div>

      {/* Bars + values */}
      <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2">
        {/* ── Product A (right-aligned — bar grows from right to left) ── */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[11px] font-mono font-bold tabular-nums ${
              aWins ? 'text-lime-600 dark:text-lime-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {lineA.points}pt · {formatVal(lineA)}
          </span>
          {/* Track with justify-end so fill expands right→left (mirror effect) */}
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex justify-end">
            <div
              className={`nc-score-bar h-full rounded-full ${barColor(pctA)}`}
              style={{ '--nc-fill-w': `${pctA}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* VS */}
        <div className="text-center text-[9px] font-mono font-bold text-gray-300 dark:text-gray-700">
          VS
        </div>

        {/* ── Product B (left-aligned — bar grows left to right) ── */}
        <div className="flex flex-col items-start gap-1">
          <span
            className={`text-[11px] font-mono font-bold tabular-nums ${
              bWins ? 'text-lime-600 dark:text-lime-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {lineB.points}pt · {formatVal(lineB)}
          </span>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`nc-score-bar h-full rounded-full ${barColor(pctB)}`}
              style={{ '--nc-fill-w': `${pctB}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      {(lineA.note || lineB.note) && (
        <div className="mt-1.5 grid grid-cols-[1fr_28px_1fr] gap-2 text-[9px] italic text-gray-400 dark:text-gray-600">
          <span className="text-right">{lineA.note ?? ''}</span>
          <span />
          <span>{lineB.note ?? ''}</span>
        </div>
      )}
    </div>
  );
};

/* ── Main component ───────────────────────────────────────────────────────── */
export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  scoreA,
  scoreB,
  productAName,
  productBName,
}) => {
  /* Pair lines by key for robustness (in case order ever differs) */
  const pairedLines = scoreA.lines.map(lineA => ({
    lineA,
    lineB: scoreB.lines.find(l => l.key === lineA.key) ?? {
      ...lineA,
      value: null,
      points: 0,
    },
  }));

  const aWinsTotal = scoreA.total > scoreB.total;
  const bWinsTotal = scoreB.total > scoreA.total;

  return (
    <Card>
      {/* Header: product name columns */}
      <div className="grid grid-cols-[1fr_28px_1fr] gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
        <p
          className={`text-xs font-bold text-right truncate ${
            aWinsTotal
              ? 'text-lime-600 dark:text-lime-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
          title={productAName}
        >
          {productAName}
        </p>
        <div />
        <p
          className={`text-xs font-bold truncate ${
            bWinsTotal
              ? 'text-lime-600 dark:text-lime-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
          title={productBName}
        >
          {productBName}
        </p>
      </div>

      {/* Criterion rows */}
      <div className="px-4">
        {pairedLines.map(({ lineA, lineB }) => (
          <PairedRow key={lineA.key} lineA={lineA} lineB={lineB} />
        ))}
      </div>

      {/* Total score row */}
      <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
        <div className="text-right">
          <span
            className={`text-lg font-bold font-mono ${
              aWinsTotal ? 'text-lime-500 dark:text-lime-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {scoreA.total}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">/100</span>
        </div>
        <div className="text-center text-[9px] font-mono font-bold text-gray-300 dark:text-gray-700">
          PTS
        </div>
        <div>
          <span
            className={`text-lg font-bold font-mono ${
              bWinsTotal ? 'text-lime-500 dark:text-lime-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {scoreB.total}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">/100</span>
        </div>
      </div>

      {/* Disqualification callouts */}
      {(scoreA.disqualified || scoreB.disqualified) && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {scoreA.disqualified && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/40">
              <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-400">
                <strong>Opção A desclassificada:</strong>{' '}
                {scoreA.disqualifyReason}
              </p>
            </div>
          )}
          {scoreB.disqualified && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/40">
              <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-400">
                <strong>Opção B desclassificada:</strong>{' '}
                {scoreB.disqualifyReason}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
