import '../styles.css';
import React from 'react';
import { ScanLine, Settings, History } from 'lucide-react';
import { UserGoal } from '../types';

interface HeaderProps {
  goal: UserGoal | null;
  onChangeGoal: () => void;
  onOpenHistory: () => void;
}

const GOAL_LABELS: Record<UserGoal, string> = {
  weight_loss: 'Perda de peso',
  muscle_gain: 'Hipertrofia',
  diabetes:    'Glicemia',
  low_carb:    'Low Carb',
  vegan:       'Vegano',
  general:     'Geral',
};

export const Header: React.FC<HeaderProps> = ({
  goal,
  onChangeGoal,
  onOpenHistory,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFFBEF] border-b-[3px] border-[#000]">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Wordmark — chunky black block */}
        <div className="flex items-center gap-2 nc-box-sm bg-[#000] px-3 py-1.5 shrink-0">
          <ScanLine className="w-4 h-4 text-[#FFFBEF] shrink-0" aria-hidden />
          <span className="font-mono font-bold text-sm tracking-wider text-[#FFFBEF] uppercase">
            NUTRI<span className="text-[#C6F833]">COMPARE</span>
          </span>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">

          {/* History button */}
          <button
            onClick={onOpenHistory}
            aria-label="Abrir histórico de comparações"
            className="nc-btn p-2 bg-[#FFFFFF] flex items-center justify-center"
          >
            <History className="w-4 h-4 text-[#000]" aria-hidden />
          </button>

          {/* Goal chip — yellow block */}
          {goal && (
            <button
              onClick={onChangeGoal}
              aria-label={`Objetivo atual: ${GOAL_LABELS[goal]}. Toque para alterar.`}
              className="nc-btn flex items-center gap-1.5 h-9 px-3 bg-[#FFD23F] text-[#000]"
            >
              <Settings className="w-3 h-3" aria-hidden />
              <span className="font-mono font-bold text-[10px] tracking-wide uppercase">
                {GOAL_LABELS[goal]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
