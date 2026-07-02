import { GoalScore, NormalizedProduct, ScoreLine } from '../../../types';

/**
 * Scoring framework for the "Emagrecimento" (weight loss) goal.
 * Ported from the weight_loss EXPERT_PROFILE in geminiService.ts.
 *
 * Total possible: 100 pts
 *   Açúcar          25 pts (critério mais importante)
 *   Proteínas        20 pts
 *   Calorias         20 pts  [converted to absolute tiers — see note below]
 *   Fibras           15 pts
 *   Sódio            10 pts
 *   Gorduras Sat.    10 pts
 *
 * Note on Calorias: the original prompt used a relative criterion
 * ("cada 50 kcal a menos vs. the other product"). Since score() is per-product,
 * absolute tiers were defined using 100 / 150 / 200 / 300 kcal breakpoints.
 */
export function scoreWeightLoss(p: NormalizedProduct): GoalScore {
  const lines: ScoreLine[] = [];
  const n = p.per100g;

  // ── AÇÚCAR (25 pts — critério mais importante) ──────────────────────────────
  {
    const v = n.sugar;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 3) {
      pts = 25; note = 'Excelente';
    } else if (v < 6) {
      pts = 18; note = 'Bom';
    } else if (v < 10) {
      pts = 10; note = 'Moderado';
    } else if (v < 15) {
      pts = 4; note = 'Ruim';
    } else {
      pts = 0; note = 'Péssimo — picos de insulina sabotam emagrecimento';
    }
    lines.push({ key: 'sugar', label: 'Açúcar', value: v, unit: 'g', points: pts, maxPoints: 25, note });
  }

  // ── PROTEÍNAS (20 pts) ──────────────────────────────────────────────────────
  {
    const v = n.protein;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 15) {
      pts = 20; note = 'Alta — saciedade e preservação muscular';
    } else if (v >= 10) {
      pts = 14; note = 'Boa';
    } else if (v >= 6) {
      pts = 8; note = 'Moderada';
    } else {
      pts = 3; note = 'Baixa';
    }
    lines.push({ key: 'protein', label: 'Proteínas', value: v, unit: 'g', points: pts, maxPoints: 20, note });
  }

  // ── CALORIAS (20 pts) ───────────────────────────────────────────────────────
  {
    const v = n.calories;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 100) {
      pts = 20; note = 'Muito baixo';
    } else if (v < 150) {
      pts = 15; note = 'Baixo';
    } else if (v < 200) {
      pts = 10; note = 'Moderado';
    } else if (v < 300) {
      pts = 5; note = 'Alto';
    } else {
      pts = 0; note = 'Muito alto';
    }
    lines.push({ key: 'calories', label: 'Calorias', value: v, unit: 'kcal', points: pts, maxPoints: 20, note });
  }

  // ── FIBRAS (15 pts) ─────────────────────────────────────────────────────────
  {
    const v = n.fiber;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 5) {
      pts = 15; note = 'Excelente — saciedade prolongada';
    } else if (v >= 3) {
      pts = 10; note = 'Boa';
    } else if (v >= 1) {
      pts = 5; note = 'Moderada';
    } else {
      pts = 0; note = 'Insuficiente';
    }
    lines.push({ key: 'fiber', label: 'Fibras', value: v, unit: 'g', points: pts, maxPoints: 15, note });
  }

  // ── SÓDIO (10 pts) ──────────────────────────────────────────────────────────
  {
    const v = n.sodium;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 200) {
      pts = 10; note = 'Excelente';
    } else if (v < 400) {
      pts = 6; note = 'Moderado';
    } else if (v < 600) {
      pts = 3; note = 'Alto';
    } else {
      pts = 0; note = v > 800
        ? 'Muito alto — retenção hídrica, contraindicado'
        : 'Alto — retenção hídrica dificulta emagrecimento';
    }
    lines.push({ key: 'sodium', label: 'Sódio', value: v, unit: 'mg', points: pts, maxPoints: 10, note });
  }

  // ── GORDURAS SATURADAS (10 pts) ─────────────────────────────────────────────
  {
    const v = n.saturatedFats;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 2) {
      pts = 10; note = 'Baixa';
    } else if (v < 4) {
      pts = 6; note = 'Moderada';
    } else {
      pts = 3; note = 'Alta';
    }
    lines.push({ key: 'saturatedFats', label: 'Gorduras Saturadas', value: v, unit: 'g', points: pts, maxPoints: 10, note });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { total, lines, disqualified: false };
}
