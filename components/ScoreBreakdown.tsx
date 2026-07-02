import React from 'react';
import { GoalScore, ScoreLine } from '../types';
import { AlertOctagon } from 'lucide-react';

interface ScoreBreakdownProps {
  scoreA: GoalScore;
  scoreB: GoalScore;
  productAName: string;
  productBName: string;
}

/* Blocky bar fill color per score percentage — lime / yellow / red */
function barFill(pct: number): string {
  if (pct >= 70) return 'bg-[#C6F833]';
  if (pct >= 35) return 'bg-[#FFD23F]';
  return 'bg-[#FF5A47]';
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
    line.value !== null ? `${line.value} ${line.unit}` : '—';

  return (
    <div className="py-3 border-b-[2px] border-[var(--ink)] border-opacity-10 last:border-0">
      {/* Criterion label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink)] opacity-60">
          {lineA.label}
        </span>
        <span className="text-[9px] font-mono text-[var(--ink)] opacity-30">
          máx {lineA.maxPoints}pt
        </span>
      </div>

      {/* Bars + values: A (right-aligned mirror) | separator | B (left-aligned) */}
      <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">

        {/* ── Product A — bar grows right→left (justify-end) ── */}
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[11px] font-mono font-bold tabular-nums ${aWins ? 'text-[var(--ink)]' : 'text-[var(--ink)] opacity-40'}`}>
            {lineA.points}pt · {formatVal(lineA)}
          </span>
          {/* Track: bordered, fills right→left */}
          <div className="w-full h-3 bg-[var(--bg)] border-[2px] border-[var(--ink)] overflow-hidden flex justify-end">
            <div
              className={`nc-score-bar h-full ${barFill(pctA)}`}
              style={{ '--nc-fill-w': `${pctA}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* VS divider */}
        <div className="text-center text-[8px] font-mono font-bold text-[var(--ink)] opacity-30">
          VS
        </div>

        {/* ── Product B — bar grows left→right ── */}
        <div className="flex flex-col items-start gap-1.5">
          <span className={`text-[11px] font-mono font-bold tabular-nums ${bWins ? 'text-[var(--ink)]' : 'text-[var(--ink)] opacity-40'}`}>
            {lineB.points}pt · {formatVal(lineB)}
          </span>
          <div className="w-full h-3 bg-[var(--bg)] border-[2px] border-[var(--ink)] overflow-hidden">
            <div
              className={`nc-score-bar h-full ${barFill(pctB)}`}
              style={{ '--nc-fill-w': `${pctB}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      {(lineA.note || lineB.note) && (
        <div className="mt-1.5 grid grid-cols-[1fr_24px_1fr] gap-2 text-[9px] font-mono italic text-[var(--ink)] opacity-40">
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
  const baseLines =
    scoreA.lines.length >= scoreB.lines.length ? scoreA.lines : scoreB.lines;
  const pairedLines = baseLines.map(base => ({
    lineA: scoreA.lines.find(l => l.key === base.key) ?? { ...base, value: null, points: 0 },
    lineB: scoreB.lines.find(l => l.key === base.key) ?? { ...base, value: null, points: 0 },
  }));

  const aWinsTotal = scoreA.total > scoreB.total;
  const bWinsTotal = scoreB.total > scoreA.total;

  return (
    <div className="nc-box bg-[var(--paper2)] overflow-hidden">
      {/* Header: product name columns */}
      <div className="grid grid-cols-[1fr_24px_1fr] gap-2 px-4 py-3 bg-[var(--ink)] border-b-[3px] border-[var(--ink)]">
        <p
          className={`text-xs font-mono font-bold text-right truncate ${aWinsTotal ? 'text-[#C6F833]' : 'text-[var(--bg)] opacity-60'}`}
          title={productAName}
        >
          {productAName}
        </p>
        <div />
        <p
          className={`text-xs font-mono font-bold truncate ${bWinsTotal ? 'text-[#C6F833]' : 'text-[var(--bg)] opacity-60'}`}
          title={productBName}
        >
          {productBName}
        </p>
      </div>

      {/* Disqualification callouts */}
      {(scoreA.disqualified || scoreB.disqualified) && (
        <div className="px-4 pt-3 flex flex-col gap-2">
          {scoreA.disqualified && (
            <div className="nc-box-sm bg-[#FF5A47] p-3 flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-[#000] shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs font-mono font-bold text-[#000] leading-snug">
                <strong>Opção A desclassificada:</strong>{' '}
                {scoreA.disqualifyReason}
              </p>
            </div>
          )}
          {scoreB.disqualified && (
            <div className="nc-box-sm bg-[#FF5A47] p-3 flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-[#000] shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs font-mono font-bold text-[#000] leading-snug">
                <strong>Opção B desclassificada:</strong>{' '}
                {scoreB.disqualifyReason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Criterion rows */}
      <div className="px-4">
        {pairedLines.map(({ lineA, lineB }) => (
          <PairedRow key={lineA.key} lineA={lineA} lineB={lineB} />
        ))}
      </div>

      {/* Total score row — big numbers */}
      <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2 px-4 py-4 bg-[var(--ink)] border-t-[3px] border-[var(--ink)]">
        <div className="text-right">
          <span className={`font-display text-4xl font-black nc-count-up ${aWinsTotal ? 'text-[#C6F833]' : 'text-[var(--bg)] opacity-50'}`}>
            {scoreA.total}
          </span>
          <span className="text-xs font-mono text-[var(--bg)] opacity-40">/100</span>
        </div>
        <div className="text-center">
          <span className="text-[9px] font-mono font-bold text-[var(--bg)] opacity-40">PTS</span>
        </div>
        <div>
          <span className={`font-display text-4xl font-black nc-count-up ${bWinsTotal ? 'text-[#C6F833]' : 'text-[var(--bg)] opacity-50'}`}>
            {scoreB.total}
          </span>
          <span className="text-xs font-mono text-[var(--bg)] opacity-40">/100</span>
        </div>
      </div>
    </div>
  );
};
