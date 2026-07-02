import React from 'react';
import { ComparisonResult, UserGoal } from '../types';
import {
  Trophy,
  Equal,
  AlertOctagon,
  BookOpen,
  ScanLine,
  History,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
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
 * Exported as `ComparisonResultView` to avoid a name collision with the
 * `ComparisonResult` type from types.ts. The integration agent imports it
 * under this name.
 */
export const ComparisonResultView: React.FC<ComparisonResultProps> = ({
  result,
  onReset,
  onOpenHistory,
}) => {
  const { winner, scoreA, scoreB, productA, productB, verdict, keyReason, goal } = result;

  const isTie = winner === 'tie';
  const winnerName =
    winner === 'A'
      ? productA.productName
      : winner === 'B'
      ? productB.productName
      : null;
  const winnerScore =
    winner === 'A' ? scoreA.total : winner === 'B' ? scoreB.total : null;

  return (
    <div className="min-h-screen pt-14 pb-32 px-4 max-w-lg mx-auto nc-fade-in">

      {/* Goal + saved pill */}
      <div className="mt-5 mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="goal">{GOAL_LABELS[goal]}</Badge>
        <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 dark:text-gray-600">
          <CheckCircle2 className="w-3 h-3" />
          Salvo no histórico
        </span>
      </div>

      {/* ── Winner hero ────────────────────────────────────────────────────── */}
      {isTie ? (
        /* Tie card */
        <Card glow="indigo" className="mb-4 nc-slide-up">
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                <Equal className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <Badge variant="tie">Empate</Badge>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1.5 leading-tight">
                  Equilíbrio nutricional
                </h2>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {keyReason}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        /* Winner card with gradient border glow */
        <div className="relative mb-4 nc-slide-up">
          {/* Decorative gradient ring */}
          <div
            aria-hidden
            className="absolute -inset-[1.5px] rounded-[17px] bg-gradient-to-br from-lime-400 via-cyan-400 to-lime-300 dark:from-lime-500 dark:via-cyan-500 dark:to-lime-400 opacity-35 dark:opacity-20 blur-sm pointer-events-none"
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 overflow-hidden">
            {/* Trophy watermark */}
            <Trophy
              aria-hidden
              className="absolute -top-3 -right-3 w-28 h-28 text-lime-400/10 dark:text-lime-500/10"
            />

            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-lime-100 dark:bg-lime-950/50 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-lime-500 dark:text-lime-400" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="winner">Melhor opção</Badge>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1.5 leading-tight truncate">
                  {winnerName ?? 'Opção vencedora'}
                </h2>
                {winnerScore !== null && (
                  <p className="text-[10px] font-mono text-lime-600 dark:text-lime-400 mt-0.5">
                    {winnerScore}/100 pontos
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-lime-50 dark:bg-lime-950/25 border border-lime-100 dark:border-lime-900/40">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-lime-600 dark:text-lime-500 mb-1">
                Por que venceu
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {keyReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Disqualification alerts ────────────────────────────────────────── */}
      {(scoreA.disqualified || scoreB.disqualified) && (
        <div className="flex flex-col gap-2 mb-4 nc-slide-up nc-stagger-2">
          {scoreA.disqualified && scoreA.disqualifyReason && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/40">
              <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                  {productA.productName} — desclassificado
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-500">
                  {scoreA.disqualifyReason}
                </p>
              </div>
            </div>
          )}
          {scoreB.disqualified && scoreB.disqualifyReason && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/40">
              <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                  {productB.productName} — desclassificado
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-500">
                  {scoreB.disqualifyReason}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Score breakdown ────────────────────────────────────────────────── */}
      <div className="mb-4 nc-slide-up nc-stagger-3">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1.5">
          <BarChart2 className="w-3 h-3" />
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
      <Card className="mb-6 nc-slide-up nc-stagger-4">
        <div className="px-4 py-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            Veredicto completo
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{verdict}</p>
        </div>
      </Card>

      {/* ── Fixed action bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 nc-glass border-t border-gray-200/70 dark:border-gray-800/70">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            icon={<History className="w-4 h-4" />}
            onClick={onOpenHistory}
          >
            Histórico
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ScanLine className="w-4 h-4" />}
            onClick={onReset}
          >
            Nova comparação
          </Button>
        </div>
      </div>
    </div>
  );
};
