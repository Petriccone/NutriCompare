import React, { useState } from 'react';
import { HistoryEntry, UserGoal } from '../types';
import {
  ArrowLeft,
  Trash2,
  ExternalLink,
  Trophy,
  Equal,
  Clock,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface HistoryProps {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}

const GOAL_LABELS: Record<UserGoal, string> = {
  weight_loss: 'Perda de peso',
  muscle_gain: 'Hipertrofia',
  diabetes:    'Controle glicêmico',
  low_carb:    'Low Carb',
  vegan:       'Vegano',
  general:     'Saúde geral',
};

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function staggerClass(i: number) {
  return `nc-stagger-${Math.min(i + 1, 6)}`;
}

export const History: React.FC<HistoryProps> = ({
  entries,
  onOpen,
  onDelete,
  onClear,
  onBack,
}) => {
  /* Two-tap "confirm clear" state */
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearClick = () => {
    if (confirmClear) {
      onClear();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  return (
    <div className="min-h-screen pt-14 pb-24 px-4 max-w-lg mx-auto nc-fade-in">

      {/* Sub-header */}
      <div className="flex items-center gap-2 py-4 mb-3">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="nc-btn p-2 bg-[var(--paper2)] flex items-center justify-center -ml-1"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--ink)]" aria-hidden />
        </button>

        <h1 className="font-display text-3xl font-black text-[var(--ink)] flex-1">
          Histórico
        </h1>

        {entries.length > 0 && (
          <div className="nc-box-sm bg-[var(--ink)] px-2 py-0.5 flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-[var(--bg)]">
              {entries.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center nc-slide-up">
          <div className="nc-box bg-[var(--paper2)] w-20 h-20 flex items-center justify-center mb-6">
            <ClipboardList className="w-10 h-10 text-[var(--ink)] opacity-30" aria-hidden />
          </div>
          <h3 className="font-display text-2xl font-black text-[var(--ink)] mb-2">
            Sem comparações ainda
          </h3>
          <p className="text-sm font-sans text-[var(--ink)] opacity-60 max-w-xs leading-relaxed">
            Suas comparações são salvas automaticamente. Faça a primeira análise para vê-la aqui.
          </p>
          <div className="mt-8">
            <Button
              variant="primary"
              size="md"
              icon={<ArrowLeft className="w-4 h-4" aria-hidden />}
              onClick={onBack}
            >
              Fazer uma comparação
            </Button>
          </div>
        </div>

      ) : (
        <>
          {/* ── Entry list — receipt cards ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`nc-slide-up ${staggerClass(i)}`}
              >
                {/* Receipt card */}
                <div className="nc-box bg-[var(--paper2)] overflow-hidden">
                  {/* Winner accent bar at top */}
                  <div
                    className={`h-2 ${
                      entry.winner === 'tie'
                        ? 'bg-[#FFD23F]'
                        : 'bg-[#C6F833]'
                    }`}
                  />

                  <div className="p-4">
                    {/* Date + goal */}
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3 h-3 text-[var(--ink)] opacity-30 shrink-0" aria-hidden />
                      <span className="text-[10px] font-mono text-[var(--ink)] opacity-50 flex-1">
                        {formatDate(entry.createdAt)}
                      </span>
                      <Badge variant="goal">{GOAL_LABELS[entry.goal]}</Badge>
                    </div>

                    {/* Products side by side */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mb-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-bold font-sans truncate leading-snug ${
                            entry.winner === 'A' ? 'text-[var(--ink)]' : 'text-[var(--ink)] opacity-50'
                          }`}
                        >
                          {entry.productAName}
                        </span>
                        {entry.winner === 'A' && (
                          <span className="text-[9px] font-mono text-[#000] bg-[#C6F833] px-1 mt-1 inline-block w-fit">
                            VENCEDOR
                          </span>
                        )}
                      </div>

                      <div className="nc-box-sm bg-[var(--ink)] w-7 h-7 flex items-center justify-center mt-0.5">
                        <span className="text-[8px] font-mono font-bold text-[var(--bg)]">VS</span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-bold font-sans truncate leading-snug ${
                            entry.winner === 'B' ? 'text-[var(--ink)]' : 'text-[var(--ink)] opacity-50'
                          }`}
                        >
                          {entry.productBName}
                        </span>
                        {entry.winner === 'B' && (
                          <span className="text-[9px] font-mono text-[#000] bg-[#C6F833] px-1 mt-1 inline-block w-fit">
                            VENCEDOR
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: outcome badge + action buttons */}
                    <div className="flex items-center justify-between border-t-[2px] border-[var(--ink)] border-opacity-10 pt-3">
                      <div>
                        {entry.winner === 'tie' ? (
                          <Badge variant="tie">
                            <Equal className="w-2.5 h-2.5" aria-hidden />
                            Empate
                          </Badge>
                        ) : (
                          <Badge variant="winner">
                            <Trophy className="w-2.5 h-2.5" aria-hidden />
                            {entry.winner === 'A' ? entry.productAName : entry.productBName}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onDelete(entry.id)}
                          aria-label={`Excluir comparação entre ${entry.productAName} e ${entry.productBName}`}
                          className="nc-btn p-2 bg-[var(--bg)] flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[var(--ink)]" aria-hidden />
                        </button>
                        <button
                          onClick={() => onOpen(entry)}
                          aria-label={`Ver resultado: ${entry.productAName} vs ${entry.productBName}`}
                          className="nc-btn p-2 bg-[#C6F833] flex items-center justify-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#000]" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Clear all ────────────────────────────────────────────────── */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={handleClearClick}
              className={[
                'nc-btn flex items-center gap-2 px-5 py-2.5',
                'text-[10px] font-mono font-bold uppercase tracking-widest',
                confirmClear
                  ? 'bg-[#FF5A47] text-[#000]'
                  : 'bg-[var(--paper2)] text-[var(--ink)]',
              ].join(' ')}
            >
              {confirmClear ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
                  Confirmar — apagar tudo
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  Limpar histórico
                </>
              )}
            </button>

            {confirmClear && (
              <p className="text-[10px] font-mono text-[var(--ink)] opacity-50 text-center">
                Esta ação não pode ser desfeita. Toque novamente para confirmar.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
