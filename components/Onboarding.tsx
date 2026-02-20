import React from 'react';
import { UserGoal } from '../types';
import { Dumbbell, Scale, Activity, Apple, Leaf, Heart } from 'lucide-react';

interface OnboardingProps {
  onSelectGoal: (goal: UserGoal) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSelectGoal }) => {

  const goals: { id: UserGoal; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'weight_loss',
      label: 'PERDA DE PESO',
      icon: <Scale className="w-5 h-5" />,
      desc: 'Maximizar déficit calórico'
    },
    {
      id: 'muscle_gain',
      label: 'HIPERTROFIA',
      icon: <Dumbbell className="w-5 h-5" />,
      desc: 'Priorizar síntese proteica'
    },
    {
      id: 'diabetes',
      label: 'GLICEMIA',
      icon: <Activity className="w-5 h-5" />,
      desc: 'Controle de índice glicêmico'
    },
    {
      id: 'low_carb',
      label: 'LOW CARB',
      icon: <Apple className="w-5 h-5" />,
      desc: 'Redução de carboidratos'
    },
    {
      id: 'vegan',
      label: 'VEGANO',
      icon: <Leaf className="w-5 h-5" />,
      desc: 'Plant-based apenas'
    },
    {
      id: 'general',
      label: 'GERAL',
      icon: <Heart className="w-5 h-5" />,
      desc: 'Manutenção de saúde'
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 animate-fade-in relative overflow-hidden pt-12 pb-12">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-100 dark:bg-cyan-900/20 rounded-full blur-[100px] transition-colors duration-500"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-100 dark:bg-purple-900/20 rounded-full blur-[100px] transition-colors duration-500"></div>
      </div>

      <div className="text-center mb-10 max-w-md relative">
        <p className="text-gray-500 dark:text-gray-400 font-mono text-xs tracking-widest">SELECIONE O PROTOCOLO DE ANÁLISE</p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {goals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onSelectGoal(goal.id)}
            className="flex flex-col items-start p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-lg hover:border-cyan-400 dark:hover:border-cyan-500 hover:bg-white dark:hover:bg-gray-800 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] dark:hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300 group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gray-100 dark:from-white/5 to-transparent -mr-8 -mt-8 rounded-full"></div>

            <div className="mb-3 p-2 bg-gray-50 dark:bg-black border border-gray-100 dark:border-gray-800 rounded text-gray-600 dark:text-gray-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:border-cyan-200 dark:group-hover:border-cyan-500/50 transition-colors">
              {goal.icon}
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1 font-mono tracking-tight">{goal.label}</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight group-hover:text-gray-500 dark:group-hover:text-gray-400">{goal.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};