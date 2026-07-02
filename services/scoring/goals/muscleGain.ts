import { GoalScore, NormalizedProduct, ScoreLine } from '../../../types';

/**
 * Scoring framework for the "Ganho Muscular" (muscle gain) goal.
 * Ported from the muscle_gain EXPERT_PROFILE in geminiService.ts.
 *
 * Total possible: 100 pts
 *   Proteínas              40 pts (critério dominante)
 *   Calorias               20 pts  [more calories = more pts; converted to absolute tiers]
 *   Carboidratos Complexos 15 pts  [proxy: total carbs - sugar]
 *   Açúcar                 10 pts
 *   Gorduras Totais        10 pts
 *   Sódio                   5 pts
 *
 * Note on Calorias: the original criterion is relative ("more is better for surplus").
 * Converted to absolute tiers: higher energy density earns more points.
 *
 * Note on Carboidratos Complexos: the extracted data has total carbs and sugar;
 * complex carbs are approximated as (total carbs - sugar), floored at 0.
 */
export function scoreMuscleGain(p: NormalizedProduct): GoalScore {
  const lines: ScoreLine[] = [];
  const n = p.per100g;

  // ── PROTEÍNAS (40 pts — CRITÉRIO DOMINANTE) ─────────────────────────────────
  {
    const v = n.protein;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 20) {
      pts = 40; note = 'Elite — excelente para hipertrofia';
    } else if (v >= 15) {
      pts = 30; note = 'Excelente';
    } else if (v >= 10) {
      pts = 18; note = 'Boa';
    } else if (v >= 6) {
      pts = 8; note = 'Moderada';
    } else {
      pts = 0; note = 'Insuficiente para hipertrofia';
    }
    lines.push({ key: 'protein', label: 'Proteínas', value: v, unit: 'g', points: pts, maxPoints: 40, note });
  }

  // ── CALORIAS (20 pts — necessárias para superávit calórico) ─────────────────
  {
    const v = n.calories;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 400) {
      pts = 20; note = 'Alta densidade energética';
    } else if (v >= 300) {
      pts = 14; note = 'Boa para superávit';
    } else if (v >= 200) {
      pts = 8; note = 'Moderada';
    } else {
      pts = 2; note = 'Baixa — pode dificultar superávit calórico';
    }
    lines.push({ key: 'calories', label: 'Calorias', value: v, unit: 'kcal', points: pts, maxPoints: 20, note });
  }

  // ── CARBOIDRATOS COMPLEXOS (15 pts) ─────────────────────────────────────────
  // Proxy: total carbs - sugar (simple carbs) ≈ complex carbs
  {
    const totalCarbs = n.carbs;
    const sugarV = n.sugar;
    const complexCarbs =
      totalCarbs !== null ? Math.max(0, totalCarbs - (sugarV ?? 0)) : null;

    let pts = 0;
    let note: string | undefined;
    if (complexCarbs === null) {
      note = 'Não informado';
    } else if (complexCarbs > 30) {
      pts = 15; note = 'Alta — ótima para energia e recuperação muscular';
    } else if (complexCarbs >= 20) {
      pts = 10; note = 'Boa';
    } else {
      pts = 5; note = 'Baixa';
    }
    lines.push({
      key: 'complexCarbs',
      label: 'Carboidratos Complexos (Carbs - Açúcar)',
      value: complexCarbs,
      unit: 'g',
      points: pts,
      maxPoints: 15,
      note,
    });
  }

  // ── AÇÚCAR (10 pts) ─────────────────────────────────────────────────────────
  {
    const v = n.sugar;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 5) {
      pts = 10; note = 'Baixo';
    } else if (v < 10) {
      pts = 6; note = 'Moderado';
    } else {
      pts = 2; note = 'Alto — pico insulínico sem treino = lipogênese';
    }
    lines.push({ key: 'sugar', label: 'Açúcar', value: v, unit: 'g', points: pts, maxPoints: 10, note });
  }

  // ── GORDURAS TOTAIS (10 pts) ─────────────────────────────────────────────────
  {
    const totalFats = n.fats;
    const satFats = n.saturatedFats;
    let pts = 0;
    let note: string | undefined;
    if (totalFats === null) {
      note = 'Não informado';
    } else if (satFats !== null && satFats > 5) {
      pts = 5; note = `Gorduras saturadas elevadas (${satFats.toFixed(1)} g)`;
    } else {
      pts = 10; note = 'Adequado para hormônios anabólicos';
    }
    lines.push({ key: 'fats', label: 'Gorduras Totais', value: totalFats, unit: 'g', points: pts, maxPoints: 10, note });
  }

  // ── SÓDIO (5 pts) ────────────────────────────────────────────────────────────
  {
    const v = n.sodium;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 800) {
      pts = 0; note = 'Muito alto';
    } else {
      pts = 5; note = 'Adequado para atletas';
    }
    lines.push({ key: 'sodium', label: 'Sódio', value: v, unit: 'mg', points: pts, maxPoints: 5, note });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { total, lines, disqualified: false };
}
