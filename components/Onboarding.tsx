import React from 'react';
import { UserGoal } from '../types';
import {
  Scale,
  Dumbbell,
  Droplets,
  Zap,
  Leaf,
  Heart,
  CheckCircle2,
} from 'lucide-react';

interface OnboardingProps {
  onSelect: (goal: UserGoal) => void;
  currentGoal?: UserGoal | null;
}

interface GoalConfig {
  id: UserGoal;
  label: string;
  icon: React.ReactNode;
  /** One-line description of what is optimised */
  optimize: string;
  iconRing: string;
  iconColor: string;
}

const GOALS: GoalConfig[] = [
  {
    id: 'weight_loss',
    label: 'Perda de peso',
    icon: <Scale className="w-5 h-5" />,
    optimize: 'Menos calorias, mais saciedade',
    iconRing: 'border-cyan-200 dark:border-cyan-800/50',
    iconColor: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'muscle_gain',
    label: 'Hipertrofia',
    icon: <Dumbbell className="w-5 h-5" />,
    optimize: 'Mais proteína, menos gordura saturada',
    iconRing: 'border-indigo-200 dark:border-indigo-800/50',
    iconColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'diabetes',
    label: 'Controle glicêmico',
    icon: <Droplets className="w-5 h-5" />,
    optimize: 'Menos açúcar e carboidratos simples',
    iconRing: 'border-rose-200 dark:border-rose-800/50',
    iconColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'low_carb',
    label: 'Low carb / Keto',
    icon: <Zap className="w-5 h-5" />,
    optimize: 'Carboidratos líquidos ao mínimo',
    iconRing: 'border-amber-200 dark:border-amber-800/50',
    iconColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'vegan',
    label: 'Vegano',
    icon: <Leaf className="w-5 h-5" />,
    optimize: 'Zero ingredientes de origem animal',
    iconRing: 'border-lime-200 dark:border-lime-800/50',
    iconColor: 'bg-lime-50 dark:bg-lime-950/40 text-lime-600 dark:text-lime-400',
  },
  {
    id: 'general',
    label: 'Saúde geral',
    icon: <Heart className="w-5 h-5" />,
    optimize: 'Equilíbrio nutricional completo',
    iconRing: 'border-pink-200 dark:border-pink-800/50',
    iconColor: 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400',
  },
];

/* Stagger index cap at 6 to match nc-stagger-N classes in styles.css */
function staggerClass(i: number) {
  return `nc-stagger-${Math.min(i + 1, 6)}`;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSelect, currentGoal }) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">

      {/* Ambient background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[480px] h-[480px] rounded-full bg-indigo-100 dark:bg-indigo-950/30 blur-[110px] opacity-60 transition-colors duration-500" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[420px] h-[420px] rounded-full bg-cyan-100 dark:bg-cyan-950/20 blur-[100px] opacity-50 transition-colors duration-500" />
      </div>

      {/* Heading */}
      <div className="nc-slide-up text-center mb-8 max-w-sm px-2">
        <p className="text-[10px] font-mono font-bold tracking-[0.25em] text-gray-400 dark:text-gray-500 uppercase mb-3">
          NUTRICOMPARE v2
        </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
          Qual é o seu{' '}
          <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            objetivo
          </span>
          ?
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          O motor de comparação ajusta os critérios de pontuação ao seu perfil.
        </p>
      </div>

      {/* Goal grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {GOALS.map((goal, i) => {
          const isActive = currentGoal === goal.id;
          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              aria-pressed={isActive}
              className={[
                'nc-slide-up',
                staggerClass(i),
                'relative flex flex-col items-start gap-2.5 p-4 rounded-xl text-left',
                'border transition-all duration-200 active:scale-[0.97]',
                isActive
                  ? [
                      'bg-indigo-50 dark:bg-indigo-950/40',
                      'border-indigo-300 dark:border-indigo-700',
                      'shadow-[0_0_20px_rgba(99,102,241,0.14)]',
                    ].join(' ')
                  : [
                      'bg-white dark:bg-gray-900',
                      'border-gray-200 dark:border-gray-800',
                      'hover:border-indigo-200 dark:hover:border-indigo-800',
                      'hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
                    ].join(' '),
              ].join(' ')}
            >
              {/* Selected indicator */}
              {isActive && (
                <CheckCircle2
                  aria-hidden
                  className="absolute top-2.5 right-2.5 w-4 h-4 text-indigo-600 dark:text-indigo-400"
                />
              )}

              {/* Icon */}
              <div
                className={`p-2 rounded-lg border ${goal.iconRing} ${goal.iconColor} transition-colors`}
              >
                {goal.icon}
              </div>

              {/* Text */}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-0.5">
                  {goal.label}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                  {goal.optimize}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
