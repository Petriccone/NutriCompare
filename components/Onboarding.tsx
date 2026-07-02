import React from 'react';
import { UserGoal } from '../types';
import {
  Scale,
  Dumbbell,
  Droplets,
  Zap,
  Leaf,
  Heart,
  Check,
} from 'lucide-react';

interface OnboardingProps {
  onSelect: (goal: UserGoal) => void;
  currentGoal?: UserGoal | null;
}

interface GoalConfig {
  id: UserGoal;
  label: string;
  optimize: string;
  icon: React.ReactNode;
  /** Button background fill — flat vivid color block */
  bg: string;
  /** Text color — black on light fills, white on dark fills */
  text: string;
}

/* 2–3 accents per screen: yellow / blue / pink / lime / red / cream (neutral) */
const GOALS: GoalConfig[] = [
  {
    id: 'weight_loss',
    label: 'Perda de peso',
    optimize: 'Menos calorias, mais saciedade',
    icon: <Scale className="w-5 h-5" aria-hidden />,
    bg:   'bg-[#FFD23F]',
    text: 'text-[#000]',
  },
  {
    id: 'muscle_gain',
    label: 'Hipertrofia',
    optimize: 'Mais proteína, menos gord. saturada',
    icon: <Dumbbell className="w-5 h-5" aria-hidden />,
    bg:   'bg-[#2B4BF2]',
    text: 'text-[#fff]',  /* white on blue → 6.2:1 AA */
  },
  {
    id: 'diabetes',
    label: 'Controle glicêmico',
    optimize: 'Menos açúcar e carboidratos',
    icon: <Droplets className="w-5 h-5" aria-hidden />,
    bg:   'bg-[#FF7DE3]',
    text: 'text-[#000]',
  },
  {
    id: 'low_carb',
    label: 'Low Carb / Keto',
    optimize: 'Carboidratos líquidos ao mínimo',
    icon: <Zap className="w-5 h-5" aria-hidden />,
    bg:   'bg-[#FF5A47]',
    text: 'text-[#000]',
  },
  {
    id: 'vegan',
    label: 'Vegano',
    optimize: 'Zero ingredientes de origem animal',
    icon: <Leaf className="w-5 h-5" aria-hidden />,
    bg:   'bg-[#C6F833]',
    text: 'text-[#000]',
  },
  {
    id: 'general',
    label: 'Saúde geral',
    optimize: 'Equilíbrio nutricional completo',
    icon: <Heart className="w-5 h-5" aria-hidden />,
    bg:   'bg-[var(--paper2)]',
    text: 'text-[var(--ink)]',
  },
];

function staggerClass(i: number) {
  return `nc-stagger-${Math.min(i + 1, 6)}`;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSelect, currentGoal }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">

      {/* Heading */}
      <div className="nc-slide-up text-center mb-8 max-w-sm">
        <div className="inline-block nc-box-sm bg-[var(--ink)] px-3 py-1 mb-4">
          <span className="font-mono font-bold text-[10px] tracking-[0.25em] text-[var(--bg)] uppercase">
            NUTRICOMPARE v2
          </span>
        </div>
        <h1 className="font-display text-4xl font-black text-[var(--ink)] leading-tight mb-3">
          Qual é o seu objetivo?
        </h1>
        <p className="text-sm font-sans text-[var(--ink)] opacity-60 leading-relaxed">
          O motor de comparação ajusta os critérios de pontuação ao seu perfil.
        </p>
      </div>

      {/* Goal grid — chunky sticker buttons */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
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
                'nc-btn',
                'relative flex flex-col gap-3 p-4 text-left',
                goal.bg,
                goal.text,
                isActive ? 'nc-btn-pressed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Icon in bordered circle */}
              <div className="w-10 h-10 rounded-full border-[3px] border-[var(--ink)] flex items-center justify-center bg-[rgba(0,0,0,0.08)] shrink-0">
                {goal.icon}
              </div>

              {/* Text */}
              <div>
                <p className="font-display font-black text-base leading-tight mb-0.5">
                  {goal.label}
                </p>
                <p className="text-[11px] font-mono leading-snug opacity-75">
                  {goal.optimize}
                </p>
              </div>

              {/* Selected checkmark */}
              {isActive && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-[var(--ink)] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-[var(--bg)]" aria-hidden />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
