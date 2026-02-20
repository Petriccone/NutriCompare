import React from 'react';
import { ComparisonResult, ProductAnalysis, UserGoal } from '../types';
import { Trophy, Check, Sparkles, Activity, AlertCircle, Scan } from 'lucide-react';

interface ComparisonResultProps {
  result: ComparisonResult;
  userGoal: UserGoal;
  onReset: () => void;
}

const cleanNum = (val: string) => {
  if (!val) return 0;
  const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

const NutrientBar = ({ label, valA, valB, unit = "g", isReverse = false }: { label: string, valA: string, valB: string, unit?: string, isReverse?: boolean }) => {
  const numA = cleanNum(valA);
  const numB = cleanNum(valB);
  const max = Math.max(numA, numB, 1);
  const percentageA = (numA / max) * 100;
  const percentageB = (numB / max) * 100;

  const goodColor = 'bg-lime-500';
  const badColor = 'bg-gray-700';
  
  const colorA = numA >= numB ? (isReverse ? badColor : goodColor) : (isReverse ? goodColor : badColor);
  const colorB = numB >= numA ? (isReverse ? badColor : goodColor) : (isReverse ? goodColor : badColor);

  return (
    <div className="py-4 border-b border-gray-900 last:border-0">
      <div className="flex justify-between text-[10px] font-mono font-bold text-gray-500 mb-2 uppercase tracking-widest">
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-gray-300">{valA || '0'}</span>
          <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden flex justify-end">
            <div className={`h-full ${colorA} shadow-[0_0_8px_rgba(163,230,53,0.2)]`} style={{ width: `${percentageA}%` }} />
          </div>
        </div>
        <div className="text-gray-700 text-[9px] font-mono font-bold">VS</div>
        <div className="flex-1 flex flex-col items-start gap-1">
          <span className="text-sm font-bold text-gray-300">{valB || '0'}</span>
          <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full ${colorB} shadow-[0_0_8px_rgba(163,230,53,0.2)]`} style={{ width: `${percentageB}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ComparisonResultView: React.FC<ComparisonResultProps> = ({ result, userGoal, onReset }) => {
  const { productA, productB, winner, goalFitReason, verdict } = result;
  const winnerData = winner === 'B' ? productB : productA;
  const isTie = winner === 'Tie';

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-24 pt-20 px-4 max-w-lg mx-auto">
      
      {/* Winner Card */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-lime-500 to-cyan-500 rounded-2xl blur opacity-20"></div>
        <div className="relative bg-black border border-gray-800 rounded-2xl p-6 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-20 h-20 text-lime-400" />
            </div>
            
            <div className="flex items-center gap-2 mb-4">
                <span className="bg-lime-900/30 text-lime-400 text-[10px] font-mono font-bold px-2 py-1 rounded border border-lime-500/30 uppercase tracking-widest">
                    {isTie ? 'EMPATE' : 'MELHOR OPÇÃO'}
                </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                {isTie ? "Equilíbrio Nutricional" : (winnerData.productName || "Produto Selecionado")}
            </h2>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 mt-4">
                <p className="text-lime-400 text-sm font-bold mb-1 font-mono">PONTO CHAVE:</p>
                <p className="text-gray-300 text-sm leading-relaxed">{goalFitReason}</p>
            </div>
        </div>
      </div>

      {/* Analysis Details */}
      <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 bg-gray-900/30 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                Métricas Comparativas
            </h3>
        </div>
        
        <div className="p-4">
            <NutrientBar label="Calorias" valA={productA.nutrition.calories} valB={productB.nutrition.calories} isReverse={true} />
            <NutrientBar label="Proteína" valA={productA.nutrition.protein} valB={productB.nutrition.protein} />
            <NutrientBar label="Carboidratos" valA={productA.nutrition.carbs} valB={productB.nutrition.carbs} isReverse={userGoal === 'low_carb' || userGoal === 'diabetes'} />
            <NutrientBar label="Açúcares" valA={productA.nutrition.sugar} valB={productB.nutrition.sugar} isReverse={true} />
            <NutrientBar label="Sódio" valA={productA.nutrition.sodium} valB={productB.nutrition.sodium} isReverse={true} />
        </div>

        <div className="p-4 bg-gray-900/20 border-t border-gray-800">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-2 tracking-widest">Análise do Especialista</p>
            <p className="text-xs text-gray-400 leading-relaxed italic">"{verdict}"</p>
        </div>
      </div>

      <button 
          onClick={onReset}
          className="w-full py-4 bg-white text-black rounded-xl font-bold font-mono text-sm tracking-widest hover:bg-lime-400 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
      >
          <Scan className="w-5 h-5" />
          ESCANEAR NOVOS PRODUTOS
      </button>
    </div>
  );
};