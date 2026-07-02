import React, { useState } from 'react';
import {
  ExtractedProduct,
  MeasurementBasis,
  NutritionFacts,
  UserGoal,
} from '../types';
import { AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface NutritionReviewProps {
  product: ExtractedProduct;
  label: string;
  goal: UserGoal;
  onConfirm: (edited: ExtractedProduct) => void;
  onRetake: () => void;
}

type NutrientKey = keyof NutritionFacts;

interface FieldDef {
  key: NutrientKey;
  label: string;
  unit: string;
  step: string;
}

const FIELDS: FieldDef[] = [
  { key: 'calories',      label: 'Calorias',          unit: 'kcal', step: '1'   },
  { key: 'protein',       label: 'Proteínas',          unit: 'g',    step: '0.1' },
  { key: 'carbs',         label: 'Carboidratos',       unit: 'g',    step: '0.1' },
  { key: 'sugar',         label: 'Açúcares',           unit: 'g',    step: '0.1' },
  { key: 'fats',          label: 'Gorduras totais',    unit: 'g',    step: '0.1' },
  { key: 'saturatedFats', label: 'Gorduras saturadas', unit: 'g',    step: '0.1' },
  { key: 'fiber',         label: 'Fibras',             unit: 'g',    step: '0.1' },
  { key: 'sodium',        label: 'Sódio',              unit: 'mg',   step: '1'   },
];

const CONFIDENCE_LABEL: Record<ExtractedProduct['confidence'], string> = {
  high:   'Alta confiança de leitura',
  medium: 'Confiança média — verifique os valores',
  low:    'Baixa confiança — corrija antes de continuar',
};

const CONFIDENCE_BADGE_VARIANT: Record<
  ExtractedProduct['confidence'],
  'high' | 'medium' | 'low'
> = { high: 'high', medium: 'medium', low: 'low' };

/* "" → null, valid numeric string → number, invalid → null */
function strToNum(s: string): number | null {
  if (s.trim() === '') return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function numToStr(v: number | null): string {
  return v === null || v === undefined ? '' : String(v);
}

type FieldState = Record<NutrientKey, string>;

function initFields(nutrition: NutritionFacts): FieldState {
  return {
    calories:      numToStr(nutrition.calories),
    protein:       numToStr(nutrition.protein),
    carbs:         numToStr(nutrition.carbs),
    sugar:         numToStr(nutrition.sugar),
    fats:          numToStr(nutrition.fats),
    saturatedFats: numToStr(nutrition.saturatedFats),
    fiber:         numToStr(nutrition.fiber),
    sodium:        numToStr(nutrition.sodium),
  };
}

/* Input field shared styling */
const inputCls = [
  'text-sm font-mono font-bold text-right text-gray-900 dark:text-gray-100',
  'bg-gray-50 dark:bg-gray-800/60',
  'border border-gray-200 dark:border-gray-700 rounded-lg',
  'px-2.5 py-1.5 w-24',
  'focus:border-indigo-400 dark:focus:border-indigo-500',
  'focus:ring-1 focus:ring-indigo-400/30 outline-none',
  'transition-colors',
  'placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal',
].join(' ');

const textInputCls = [
  'w-full text-sm font-semibold text-gray-900 dark:text-gray-100',
  'bg-gray-50 dark:bg-gray-800/60',
  'border border-gray-200 dark:border-gray-700 rounded-lg',
  'px-3 py-2',
  'focus:border-indigo-400 dark:focus:border-indigo-500',
  'focus:ring-1 focus:ring-indigo-400/30 outline-none',
  'transition-colors',
  'placeholder:text-gray-400 dark:placeholder:text-gray-600',
].join(' ');

export const NutritionReview: React.FC<NutritionReviewProps> = ({
  product,
  label,
  goal: _goal, // available for future goal-specific hints
  onConfirm,
  onRetake,
}) => {
  const [name, setName] = useState(product.productName);
  const [basis, setBasis] = useState<MeasurementBasis>(product.basis);
  const [servingSize, setServingSize] = useState(numToStr(product.servingSizeG));
  const [fields, setFields] = useState<FieldState>(() => initFields(product.nutrition));

  const handleField = (key: NutrientKey, val: string) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleConfirm = () => {
    const nutrition: NutritionFacts = {
      calories:      strToNum(fields.calories),
      protein:       strToNum(fields.protein),
      carbs:         strToNum(fields.carbs),
      sugar:         strToNum(fields.sugar),
      fats:          strToNum(fields.fats),
      saturatedFats: strToNum(fields.saturatedFats),
      fiber:         strToNum(fields.fiber),
      sodium:        strToNum(fields.sodium),
    };
    onConfirm({
      ...product,
      productName: name.trim() || product.productName,
      basis,
      servingSizeG: strToNum(servingSize),
      nutrition,
    });
  };

  return (
    <div className="min-h-screen pt-14 pb-28 px-4 max-w-lg mx-auto nc-fade-in">

      {/* Page header */}
      <div className="mt-5 mb-4">
        <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">
          {label}
        </p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1 mb-1">
          Revise os dados extraídos
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Corrija os valores que a IA possa ter lido incorretamente.
        </p>
      </div>

      {/* Confidence badge */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant={CONFIDENCE_BADGE_VARIANT[product.confidence]}>
          {CONFIDENCE_LABEL[product.confidence]}
        </Badge>
      </div>

      {/* Warnings */}
      {product.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 mb-4">
          {product.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main form card */}
      <Card className="mb-4">

        {/* Product name */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <label
            htmlFor="review-name"
            className="block text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5"
          >
            Nome do produto
          </label>
          <input
            id="review-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={textInputCls}
            placeholder="Nome do produto"
          />
        </div>

        {/* Basis toggle + serving size */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
            Valores referentes a
          </p>
          <div className="flex gap-2 mb-3">
            {(['per_100g', 'per_serving'] as MeasurementBasis[]).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                aria-pressed={basis === b}
                className={[
                  'flex-1 h-9 rounded-lg',
                  'text-[10px] font-mono font-bold tracking-wide uppercase',
                  'border transition-all duration-150',
                  basis === b
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-transparent'
                    : 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300',
                ].join(' ')}
              >
                {b === 'per_100g' ? '100 g' : 'Por porção'}
              </button>
            ))}
          </div>

          {basis === 'per_serving' && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="review-serving"
                className="text-xs text-gray-500 dark:text-gray-400 shrink-0"
              >
                Tamanho da porção:
              </label>
              <input
                id="review-serving"
                type="number"
                value={servingSize}
                onChange={e => setServingSize(e.target.value)}
                placeholder="ex: 30"
                step="1"
                min="0"
                className={inputCls}
              />
              <span className="text-xs text-gray-400 dark:text-gray-600">g</span>
            </div>
          )}
        </div>

        {/* Nutrient fields */}
        <div className="px-4 py-1">
          {FIELDS.map((f, i) => (
            <div
              key={f.key}
              className={`flex items-center justify-between py-3 ${
                i < FIELDS.length - 1 ? 'border-b border-gray-100 dark:border-gray-800/60' : ''
              }`}
            >
              <label
                htmlFor={`nut-${f.key}`}
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`nut-${f.key}`}
                  type="number"
                  value={fields[f.key]}
                  onChange={e => handleField(f.key, e.target.value)}
                  step={f.step}
                  min="0"
                  placeholder="—"
                  className={inputCls}
                />
                <span className="text-xs text-gray-400 dark:text-gray-600 w-7 shrink-0 text-left">
                  {f.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Ingredients preview (read-only, reference) */}
      {product.ingredients.length > 0 && (
        <Card className="mb-6">
          <div className="px-4 py-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
              Ingredientes identificados
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {product.ingredients.join(', ')}
            </p>
          </div>
        </Card>
      )}

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 nc-glass border-t border-gray-200/70 dark:border-gray-800/70">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={onRetake}
          >
            Refazer
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleConfirm}
          >
            Confirmar e continuar
          </Button>
        </div>
      </div>
    </div>
  );
};
