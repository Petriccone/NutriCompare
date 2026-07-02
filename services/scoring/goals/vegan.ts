import { GoalScore, NormalizedProduct, ScoreLine } from '../../../types';
import { detectAnimalIngredient } from '../normalize';

// ── Ingredient heuristics ────────────────────────────────────────────────────

/** Complete plant-based protein sources (per vegan expert profile). */
const COMPLETE_PROTEIN_SOURCES = [
  'soja', 'tofu', 'tempeh', 'edamame', 'quinoa', 'amaranto',
  'proteína de soja', 'proteína vegetal',
];

/** Iron-rich plant foods. */
const IRON_RICH_SOURCES = [
  'feijão', 'lentilha', 'grão-de-bico', 'ervilha', 'leguminosa',
  'sementes de abóbora', 'gergelim', 'tahini', 'chia', 'linhaça',
  'castanha', 'nozes', 'aveia', 'quinoa', 'espinafre', 'couve',
  'farinha integral', 'grão integral',
];

/** Indicators of B12 fortification or natural calcium sources. */
const B12_CALCIUM_SOURCES = [
  'enriquecido', 'enriquecida', 'vitamina b12', 'cianocobalamina',
  'cálcio', 'calcium', 'tahini', 'amêndoa', 'tofu', 'gergelim',
];

/** Legumes for protein combination check. */
const LEGUMES = ['feijão', 'lentilha', 'grão-de-bico', 'soja', 'ervilha', 'grão de bico'];

/** Cereals for protein combination check. */
const CEREALS = ['arroz', 'milho', 'trigo', 'aveia', 'quinoa', 'amaranto', 'cevada'];

function hasAnyOf(ingredients: string[], targets: string[]): boolean {
  const joined = ingredients.join(' ').toLowerCase();
  return targets.some((t) => joined.includes(t.toLowerCase()));
}

/**
 * Scoring framework for the "Vegano" goal.
 * Ported from the vegan EXPERT_PROFILE in geminiService.ts.
 *
 * Total possible: 100 pts (only when not disqualified)
 *   Proteínas Vegetais   30 pts
 *   Qualidade Proteína   10 pts  (ingredient heuristic)
 *   Ferro                10 pts  (ingredient heuristic)
 *   B12 e Cálcio         10 pts  (ingredient heuristic)
 *   Processamento        20 pts  (ingredient count heuristic)
 *   Balanço Geral        20 pts  (sugar 8 + satFats 6 + sodium 6)
 *
 * PASSO 1: animal ingredient detected → disqualified=true, total=0.
 * Undetermined (no ingredients) → not disqualified, ingredient-based criteria score 0.
 */
export function scoreVegan(p: NormalizedProduct): GoalScore {
  const n = p.per100g;

  // ── PASSO 1 — VERIFICAÇÃO ELIMINATÓRIA ──────────────────────────────────────
  if (p.isAnimalFree === false) {
    const found = detectAnimalIngredient(p.ingredients);
    return {
      total: 0,
      lines: [],
      disqualified: true,
      disqualifyReason: `Ingrediente animal detectado${found ? ` ("${found}")` : ''} — produto não é vegano`,
    };
  }

  const lines: ScoreLine[] = [];

  // ── PASSO 2 — ANÁLISE NUTRICIONAL ───────────────────────────────────────────

  // ── PROTEÍNAS VEGETAIS (30 pts) ──────────────────────────────────────────────
  {
    const v = n.protein;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 10) {
      pts = 30; note = 'Excelente para produto vegano';
    } else if (v >= 6) {
      pts = 20; note = 'Boa fonte de proteína vegetal';
    } else if (v >= 3) {
      pts = 10; note = 'Moderada';
    } else {
      pts = 3; note = 'Baixa';
    }
    lines.push({ key: 'protein', label: 'Proteínas Vegetais', value: v, unit: 'g', points: pts, maxPoints: 30, note });
  }

  // ── QUALIDADE DA PROTEÍNA (10 pts) ───────────────────────────────────────────
  {
    const hasComplete = hasAnyOf(p.ingredients, COMPLETE_PROTEIN_SOURCES);
    const hasLegume = hasAnyOf(p.ingredients, LEGUMES);
    const hasCereal = hasAnyOf(p.ingredients, CEREALS);
    const hasCombination = hasLegume && hasCereal;

    let pts: number;
    let note: string;
    if (hasComplete) {
      pts = 10; note = 'Proteína completa (fonte vegetal completa)';
    } else if (hasCombination) {
      pts = 10; note = 'Combinação leguminosa + cereal = proteína completa';
    } else {
      pts = 5; note = p.ingredients.length > 0
        ? 'Proteína incompleta'
        : 'Ingredientes não disponíveis para avaliar qualidade';
    }
    lines.push({ key: 'proteinQuality', label: 'Qualidade da Proteína', value: null, unit: '', points: pts, maxPoints: 10, note });
  }

  // ── FERRO (10 pts) ───────────────────────────────────────────────────────────
  {
    const hasIron = hasAnyOf(p.ingredients, IRON_RICH_SOURCES);
    const pts = hasIron ? 10 : 0;
    const note = hasIron
      ? 'Fontes de ferro vegetal detectadas'
      : p.ingredients.length > 0
        ? 'Nenhuma fonte de ferro detectada'
        : 'Ingredientes não disponíveis';
    lines.push({ key: 'iron', label: 'Ferro', value: null, unit: '', points: pts, maxPoints: 10, note });
  }

  // ── B12 E CÁLCIO (10 pts) ────────────────────────────────────────────────────
  {
    const hasB12Ca = hasAnyOf(p.ingredients, B12_CALCIUM_SOURCES);
    const pts = hasB12Ca ? 10 : 0;
    const note = hasB12Ca
      ? 'Enriquecido ou fonte natural de B12/Cálcio'
      : p.ingredients.length > 0
        ? 'Nenhuma fonte de B12 ou cálcio detectada'
        : 'Ingredientes não disponíveis';
    lines.push({ key: 'b12calcium', label: 'B12 e Cálcio', value: null, unit: '', points: pts, maxPoints: 10, note });
  }

  // ── PROCESSAMENTO (20 pts) ───────────────────────────────────────────────────
  {
    const count = p.ingredients.length;
    let pts = 0;
    let note: string | undefined;
    if (count === 0) {
      pts = 10; note = 'Lista de ingredientes não disponível';
    } else if (count < 5) {
      pts = 20; note = `${count} ingredientes — produto natural`;
    } else if (count <= 10) {
      pts = 14; note = `${count} ingredientes — poucos aditivos`;
    } else {
      pts = 5; note = `${count} ingredientes — ultra-processado`;
    }
    lines.push({
      key: 'processing',
      label: 'Processamento',
      value: count > 0 ? count : null,
      unit: 'ingredientes',
      points: pts,
      maxPoints: 20,
      note,
    });
  }

  // ── BALANÇO GERAL (20 pts) ───────────────────────────────────────────────────
  // Açúcar (8 pts) + Gorduras Saturadas (6 pts) + Sódio (6 pts)
  {
    const sugar = n.sugar;
    const satFats = n.saturatedFats;
    const sodium = n.sodium;

    const sugarPts =
      sugar === null ? 4 :
      sugar < 5 ? 8 :
      sugar < 10 ? 4 : 0;

    const satFatsPts =
      satFats === null ? 3 :
      satFats < 2 ? 6 :
      satFats < 4 ? 3 : 0;

    const sodiumPts =
      sodium === null ? 3 :
      sodium < 300 ? 6 :
      sodium < 600 ? 3 : 0;

    const pts = sugarPts + satFatsPts + sodiumPts;
    const parts = [
      `açúcar ${sugar ?? '?'} g`,
      `g.sat. ${satFats ?? '?'} g`,
      `sódio ${sodium ?? '?'} mg`,
    ];
    lines.push({
      key: 'balance',
      label: 'Balanço Geral (açúcar, gorduras sat., sódio)',
      value: null,
      unit: '',
      points: pts,
      maxPoints: 20,
      note: parts.join(' | '),
    });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { total, lines, disqualified: false };
}
