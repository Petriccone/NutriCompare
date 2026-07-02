import React from 'react';
import { ComparisonResult, UserGoal } from '../types';
import {
  AlertOctagon,
  BookOpen,
  ScanLine,
  History,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ScoreBreakdown } from './ScoreBreakdown';

interface ComparisonResultProps {
  result: ComparisonResult;
  onReset: () => void;
  onOpenHistory: () => void;
}

const GOAL_LABELS: Record<UserGoal, string> = {
  weight_loss: 'Perda de peso',
  muscle_gain: 'Hipertrofia',
  diabetes:    'Controle glicêmico',
  low_carb:    'Low Carb / Keto',
  vegan:       'Vegano',
  general:     'Saúde geral',
};

/**
 * Exported as `ComparisonResultView` — avoids collision with the
 * `ComparisonResult` type. App.tsx imports it under this name.
 */
export const ComparisonResultView: React.FC<ComparisonResultProps> = ({
  result,
  onReset,
  onOpenHistory,
}) => {
  const { winner, scoreA, scoreB, productA, productB, verdict, keyReason, goal } = result;

  const isTie = winner === 'tie';

  /* Derive winner/loser for the VS duel layout */
  const winnerProduct = winner === 'A' ? productA : winner === 'B' ? productB : null;
  const loserProduct  = winner === 'A' ? productB : winner === 'B' ? productA : null;
  const winnerScore   = winner === 'A' ? scoreA.total : winner === 'B' ? scoreB.total : null;
  const loserScore    = winner === 'A' ? scoreB.total : winner === 'B' ? scoreA.total : null;
  const loserIsDisqualified = winner === 'A'
    ? scoreB.disqualified
    : winner === 'B'
    ? scoreA.disqualified
    : false;

  return (
    <div className="min-h-screen pt-14 pb-32 px-4 max-w-lg mx-auto nc-fade-in">

      {/* Goal chip + saved indicator */}
      <div className="mt-5 mb-6 flex flex-wrap items-center gap-3">
        <Badge variant="goal">{GOAL_LABELS[goal]}</Badge>
        <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--ink)] opacity-50">
          <CheckCircle2 className="w-3 h-3" aria-hidden />
          Salvo no histórico
        </span>
      </div>

      {/* ── VS DUEL ──────────────────────────────────────────────────────────── */}
      {isTie ? (
        /* TIE — yellow EMPATE block */
        <div className="nc-pop-in relative mb-6">
          <div className="nc-box bg-[#FFD23F] p-6 text-center">
            <div className="flex justify-center mb-4">
              <span className="nc-sticker-tie">EMPATE</span>
            </div>
            <h2 className="font-display text-3xl font-black text-[#000] mb-2">
              Equilíbrio total
            </h2>
            <p className="font-mono text-sm text-[#000] opacity-70 leading-relaxed">
              {keyReason}
            </p>
            {/* Two products side by side */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="nc-box-sm bg-[var(--paper2)] p-3 text-left">
                <span className="font-display text-3xl font-black text-[var(--ink)] block">{scoreA.total}</span>
                <span className="text-[10px] font-mono text-[var(--ink)] opacity-50 block mb-1">pts</span>
                <span className="text-xs font-bold text-[var(--ink)] truncate block">{productA.productName}</span>
              </div>
              <div className="nc-box-sm bg-[var(--paper2)] p-3 text-left">
                <span className="font-display text-3xl font-black text-[var(--ink)] block">{scoreB.total}</span>
                <span className="text-[10px] font-mono text-[var(--ink)] opacity-50 block mb-1">pts</span>
                <span className="text-xs font-bold text-[var(--ink)] truncate block">{productB.productName}</span>
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* WINNER / LOSER duel */
        <div className="nc-pop-in relative mb-6">

          {/* ── WINNER CARD — lime block ── */}
          <div className="relative nc-box bg-[#C6F833] p-5 mb-0 overflow-visible">
            {/* MELHOR ESCOLHA sticker — slaps onto the card */}
            <div className="absolute -top-5 right-4 z-10">
              <span className="nc-sticker">MELHOR ESCOLHA</span>
            </div>

            <div className="pt-2">
              {/* Big score number */}
              <div className="flex items-end gap-2 mb-2">
                <span className="font-display text-[72px] font-black text-[#000] leading-none nc-count-up">
                  {winnerScore ?? '—'}
                </span>
                <span className="font-mono text-base font-bold text-[#000] opacity-60 mb-3">pts</span>
              </div>
              <p className="font-display font-black text-xl text-[#000] leading-tight truncate">
                {winnerProduct?.productName ?? 'Opção vencedora'}
              </p>
              <p className="font-mono text-xs text-[#000] opacity-70 mt-1 leading-snug">
                {keyReason}
              </p>
            </div>
          </div>

          {/* VS badge — yellow circle between cards */}
          <div className="flex justify-center -my-1 relative z-20">
            <div className="nc-box bg-[#FFD23F] w-14 h-14 rounded-full flex items-center justify-center">
              <span className="font-display font-black text-lg text-[#000] leading-none">VS</span>
            </div>
          </div>

          {/* ── LOSER CARD — paper2 (neutral/muted) ── */}
          <div className="relative nc-box bg-[var(--paper2)] p-5 overflow-visible">
            {/* EVITAR / CONTRAINDICADO tag */}
            <div className="absolute -top-4 right-4 z-10">
              <span className="nc-sticker-bad">
                {loserIsDisqualified ? 'CONTRAINDICADO' : 'EVITAR'}
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-end gap-2 mb-2">
                <span className="font-display text-[72px] font-black text-[var(--ink)] opacity-30 leading-none">
                  {loserScore ?? '—'}
                </span>
                <span className="font-mono text-base font-bold text-[var(--ink)] opacity-30 mb-3">pts</span>
              </div>
              <p className="font-display font-black text-xl text-[var(--ink)] opacity-50 leading-tight truncate">
                {loserProduct?.productName ?? 'Opção perdedora'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Disqualification alerts ────────────────────────────────────────── */}
      {(scoreA.disqualified || scoreB.disqualified) && (
        <div className="flex flex-col gap-3 mb-5 nc-slide-up nc-stagger-2">
          {scoreA.disqualified && scoreA.disqualifyReason && (
            <div className="nc-box-sm bg-[#FF5A47] p-4 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-[#000] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-xs font-mono font-bold text-[#000] mb-0.5">
                  {productA.productName} — desclassificado
                </p>
                <p className="text-xs font-mono text-[#000] opacity-80">
                  {scoreA.disqualifyReason}
                </p>
              </div>
            </div>
          )}
          {scoreB.disqualified && scoreB.disqualifyReason && (
            <div className="nc-box-sm bg-[#FF5A47] p-4 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-[#000] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-xs font-mono font-bold text-[#000] mb-0.5">
                  {productB.productName} — desclassificado
                </p>
                <p className="text-xs font-mono text-[#000] opacity-80">
                  {scoreB.disqualifyReason}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Score breakdown ────────────────────────────────────────────────── */}
      <div className="mb-5 nc-slide-up nc-stagger-3">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink)] opacity-50 mb-3 flex items-center gap-1.5">
          <BarChart2 className="w-3 h-3" aria-hidden />
          Análise por critério
        </p>
        <ScoreBreakdown
          scoreA={scoreA}
          scoreB={scoreB}
          productAName={productA.productName}
          productBName={productB.productName}
        />
      </div>

      {/* ── Verdict ───────────────────────────────────────────────────────── */}
      <div className="nc-box bg-[var(--paper2)] mb-6 nc-slide-up nc-stagger-4">
        <div className="px-4 py-4 border-b-[3px] border-[var(--ink)]">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink)] opacity-50 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" aria-hidden />
            Veredicto completo
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm font-sans text-[var(--ink)] leading-relaxed">{verdict}</p>
        </div>
      </div>

      {/* ── Fixed action bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--bg)] border-t-[3px] border-[var(--ink)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            icon={<History className="w-4 h-4" aria-hidden />}
            onClick={onOpenHistory}
          >
            Histórico
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ScanLine className="w-4 h-4" aria-hidden />}
            onClick={onReset}
          >
            Nova comparação
          </Button>
        </div>
      </div>
    </div>
  );
};
