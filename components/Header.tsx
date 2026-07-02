import '../styles.css';
import React from 'react';
import { Moon, Sun, ScanLine, Settings, History } from 'lucide-react';
import { UserGoal } from '../types';

interface HeaderProps {
  goal: UserGoal | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onChangeGoal: () => void;
  onOpenHistory: () => void;
}

const GOAL_LABELS: Record<UserGoal, string> = {
  weight_loss: 'Perda de peso',
  muscle_gain: 'Hipertrofia',
  diabetes: 'Glicemia',
  low_carb: 'Low Carb',
  vegan: 'Vegano',
  general: 'Geral',
};

export const Header: React.FC<HeaderProps> = ({
  goal,
  isDark,
  onToggleTheme,
  onChangeGoal,
  onOpenHistory,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div
        className={[
          'pointer-events-auto max-w-2xl mx-auto px-4 h-14',
          'flex items-center justify-between',
          'nc-glass border-b border-gray-200/70 dark:border-gray-800/70',
          'transition-colors duration-300',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="font-mono font-bold text-sm tracking-wider text-gray-900 dark:text-white">
            NUTRI
            <span className="text-indigo-500 dark:text-indigo-400">COMPARE</span>
          </span>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1.5">
          {/* History */}
          <button
            onClick={onOpenHistory}
            aria-label="Abrir histórico de comparações"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Goal pill */}
          {goal && (
            <button
              onClick={onChangeGoal}
              aria-label={`Objetivo atual: ${GOAL_LABELS[goal]}. Toque para alterar.`}
              className={[
                'flex items-center gap-1.5 h-8 px-3 rounded-lg',
                'text-[10px] font-mono font-bold tracking-wide uppercase',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-500 dark:text-gray-400',
                'hover:border-indigo-300 dark:hover:border-indigo-700',
                'hover:text-indigo-700 dark:hover:text-indigo-400',
                'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
                'transition-colors',
              ].join(' ')}
            >
              <Settings className="w-3 h-3" />
              <span>{GOAL_LABELS[goal]}</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
