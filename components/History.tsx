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
import { Card } from './ui/Card';

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
      <div className="flex items-center gap-2 py-4 mb-2">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
          Histórico
        </h1>

        {entries.length > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
            {entries.length}
          </span>
        )}
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center nc-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-6">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Nenhuma comparação ainda
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
            Suas comparações são salvas automaticamente. Faça a primeira análise
            para vê-la aqui.
          </p>
          <div className="mt-8">
            <Button
              variant="primary"
              size="md"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={onBack}
            >
              Fazer uma comparação
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Entry list ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`nc-slide-up ${staggerClass(i)}`}
              >
                <Card>
                  <div className="p-4">
                    {/* Date + goal */}
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
                      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 flex-1">
                        {formatDate(entry.createdAt)}
                      </span>
                      <Badge variant="goal">{GOAL_LABELS[entry.goal]}</Badge>
                    </div>

                    {/* Products side by side */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mb-3">
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-bold truncate leading-snug ${
                            entry.winner === 'A'
                              ? 'text-lime-600 dark:text-lime-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {entry.productAName}
                        </span>
                        {entry.winner === 'A' && (
                          <span className="text-[9px] font-mono text-lime-500">
                            vencedor
                          </span>
                        )}
                      </div>

                      <span className="text-[9px] font-mono font-bold text-gray-300 dark:text-gray-700 mt-0.5">
                        vs
                      </span>

                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-bold truncate leading-snug ${
                            entry.winner === 'B'
                              ? 'text-lime-600 dark:text-lime-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {entry.productBName}
                        </span>
                        {entry.winner === 'B' && (
                          <span className="text-[9px] font-mono text-lime-500">
                            vencedor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: winner badge + action buttons */}
                    <div className="flex items-center justify-between">
                      <div>
                        {entry.winner === 'tie' ? (
                          <Badge variant="tie">
                            <Equal className="w-2.5 h-2.5" />
                            Empate
                          </Badge>
                        ) : (
                          <Badge variant="winner">
                            <Trophy className="w-2.5 h-2.5" />
                            {entry.winner === 'A'
                              ? entry.productAName
                              : entry.productBName}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onDelete(entry.id)}
                          aria-label={`Excluir comparação entre ${entry.productAName} e ${entry.productBName}`}
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpen(entry)}
                          aria-label={`Ver resultado: ${entry.productAName} vs ${entry.productBName}`}
                          className="p-2 rounded-lg text-gray-400 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* ── Clear all ───────────────────────────────────────────────── */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              onClick={handleClearClick}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                'text-[10px] font-mono font-bold uppercase tracking-widest',
                'border transition-all duration-150',
                confirmClear
                  ? 'border-rose-400 dark:border-rose-700 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-rose-300 dark:hover:border-rose-800 hover:text-rose-500 dark:hover:text-rose-500',
              ].join(' ')}
            >
              {confirmClear ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Confirmar — apagar tudo
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar histórico
                </>
              )}
            </button>

            {confirmClear && (
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
                Esta ação não pode ser desfeita. Toque novamente para confirmar.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
