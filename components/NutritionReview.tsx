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
  high:   'Alta confiança',
  medium: 'Confiança média — verifique',
  low:    'Baixa confiança — corrija!',
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

/* Chunky bordered inputs — black border, hard focus outline */
const inputCls = [
  'text-sm font-mono font-bold text-right text-[var(--ink)]',
  'bg-[var(--bg)]',
  'border-[3px] border-[var(--ink)]',
  'px-2.5 py-1.5 w-24',
  'focus:outline-none focus:border-[#2B4BF2] focus:shadow-[2px_2px_0_#2B4BF2]',
  'transition-shadow',
  'placeholder:text-[var(--ink)] placeholder:opacity-30 placeholder:font-normal',
].join(' ');

const textInputCls = [
  'w-full text-sm font-bold text-[var(--ink)]',
  'bg-[var(--bg)]',
  'border-[3px] border-[var(--ink)]',
  'px-3 py-2',
  'focus:outline-none focus:border-[#2B4BF2] focus:shadow-[2px_2px_0_#2B4BF2]',
  'transition-shadow',
  'placeholder:text-[var(--ink)] placeholder:opacity-40',
].join(' ');

export const NutritionReview: React.FC<NutritionReviewProps> = ({
  product,
  label,
  goal: _goal,
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
      <div className="mt-6 mb-5">
        {/* Step label — ink block sticker */}
        <div className="inline-block nc-box-sm bg-[var(--ink)] px-3 py-1 mb-3">
          <span className="font-mono font-bold text-[10px] tracking-[0.25em] text-[var(--bg)] uppercase">
            {label}
          </span>
        </div>
        <h2 className="font-display text-3xl font-black text-[var(--ink)] leading-tight mb-1">
          Revise os dados
        </h2>
        <p className="text-sm font-sans text-[var(--ink)] opacity-60">
          Corrija os valores que a IA possa ter lido incorretamente.
        </p>
      </div>

      {/* Confidence badge */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant={CONFIDENCE_BADGE_VARIANT[product.confidence]}>
          {CONFIDENCE_LABEL[product.confidence]}
        </Badge>
      </div>

      {/* Warnings — bordered yellow alert */}
      {product.warnings.length > 0 && (
        <div className="nc-box-sm bg-[#FFD23F] p-3 mb-5">
          {product.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#000] shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs font-mono font-bold text-[#000] leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main form card */}
      <Card className="mb-5">

        {/* Product name */}
        <div className="px-4 pt-4 pb-3 border-b-[3px] border-[var(--ink)]">
          <label
            htmlFor="review-name"
            className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink)] opacity-50 mb-1.5"
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
        <div className="px-4 py-3 border-b-[3px] border-[var(--ink)]">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink)] opacity-50 mb-2">
            Valores referentes a
          </p>
          <div className="flex gap-3 mb-3">
            {(['per_100g', 'per_serving'] as MeasurementBasis[]).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                aria-pressed={basis === b}
                className={[
                  'nc-btn flex-1 h-10',
                  'text-[10px] font-mono font-bold tracking-wide uppercase',
                  basis === b
                    ? 'bg-[var(--ink)] text-[var(--bg)] nc-btn-pressed'
                    : 'bg-[var(--bg)] text-[var(--ink)]',
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
                className="text-xs font-mono text-[var(--ink)] opacity-60 shrink-0"
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
              <span className="text-xs font-mono text-[var(--ink)] opacity-50">g</span>
            </div>
          )}
        </div>

        {/* Nutrient fields */}
        <div className="px-4 py-1">
          {FIELDS.map((f, i) => (
            <div
              key={f.key}
              className={`flex items-center justify-between py-3 ${
                i < FIELDS.length - 1 ? 'border-b-[2px] border-[var(--ink)] border-opacity-10' : ''
              }`}
            >
              <label
                htmlFor={`nut-${f.key}`}
                className="text-sm font-sans text-[var(--ink)]"
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
                <span className="text-xs font-mono text-[var(--ink)] opacity-50 w-7 shrink-0">
                  {f.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Ingredients preview (read-only reference) */}
      {product.ingredients.length > 0 && (
        <Card className="mb-6">
          <div className="px-4 py-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ink)] opacity-50 mb-2">
              Ingredientes identificados
            </p>
            <p className="text-xs font-sans text-[var(--ink)] opacity-70 leading-relaxed">
              {product.ingredients.join(', ')}
            </p>
          </div>
        </Card>
      )}

      {/* Fixed footer — brutalist bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--bg)] border-t-[3px] border-[var(--ink)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            icon={<RotateCcw className="w-4 h-4" aria-hidden />}
            onClick={onRetake}
          >
            Refazer
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<CheckCircle2 className="w-4 h-4" aria-hidden />}
            onClick={handleConfirm}
          >
            Confirmar e continuar
          </Button>
        </div>
      </div>
    </div>
  );
};
