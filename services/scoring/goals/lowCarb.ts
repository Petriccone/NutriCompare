import { GoalScore, NormalizedProduct, ScoreLine } from '../../../types';

/**
 * Scoring framework for the "Low Carb / Cetogênico" goal.
 * Ported from the low_carb EXPERT_PROFILE in geminiService.ts.
 *
 * Total possible: 100 pts
 *   Carboidratos Líquidos 45 pts (critério dominante)
 *   Açúcar                25 pts
 *   Gorduras Boas         15 pts
 *   Proteínas             10 pts
 *   Fibras                 5 pts (bônus)
 */
export function scoreLowCarb(p: NormalizedProduct): GoalScore {
  const lines: ScoreLine[] = [];
  const n = p.per100g;

  // ── CARBOIDRATOS LÍQUIDOS (45 pts — CRITÉRIO DOMINANTE) ─────────────────────
  // netCarbs = carbs - fiber (already computed in normalize)
  {
    const v = p.netCarbs;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 3) {
      pts = 45; note = 'Cetogênico puro — excelente';
    } else if (v < 6) {
      pts = 32; note = 'Low carb estrito — ótimo';
    } else if (v < 10) {
      pts = 18; note = 'Low carb moderado — aceitável';
    } else if (v < 15) {
      pts = 6; note = 'Problemático para cetose';
    } else {
      pts = 0; note = 'Incompatível com low carb';
    }
    lines.push({
      key: 'netCarbs',
      label: 'Carboidratos Líquidos (Carbs - Fibras)',
      value: v,
      unit: 'g',
      points: pts,
      maxPoints: 45,
      note,
    });
  }

  // ── AÇÚCAR (25 pts) ──────────────────────────────────────────────────────────
  {
    const v = n.sugar;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v <= 1) {
      pts = 25; note = 'Sem açúcar — ideal';
    } else if (v < 3) {
      pts = 15; note = 'Muito baixo';
    } else if (v < 5) {
      pts = 6; note = 'Baixo';
    } else {
      pts = 0; note = 'Açúcar quebra cetose imediatamente';
    }
    lines.push({ key: 'sugar', label: 'Açúcar', value: v, unit: 'g', points: pts, maxPoints: 25, note });
  }

  // ── GORDURAS BOAS (15 pts — fonte de energia na cetose) ─────────────────────
  {
    const totalFats = n.fats;
    const satFats = n.saturatedFats;
    let pts = 0;
    let note: string | undefined;
    if (totalFats === null) {
      note = 'Não informado';
    } else if (totalFats > 10 && (satFats === null || totalFats === 0 || satFats / totalFats < 0.5)) {
      pts = 15; note = 'Gordura alta, saturadas < 50% — excelente fonte de energia para cetose';
    } else if (totalFats >= 5) {
      pts = 10; note = 'Gordura moderada';
    } else {
      pts = 5; note = 'Gordura baixa';
    }
    lines.push({ key: 'fats', label: 'Gorduras', value: totalFats, unit: 'g', points: pts, maxPoints: 15, note });
  }

  // ── PROTEÍNAS (10 pts) ───────────────────────────────────────────────────────
  {
    const v = n.protein;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 15) {
      pts = 10; note = 'Alta';
    } else if (v >= 8) {
      pts = 6; note = 'Moderada';
    } else {
      pts = 2; note = 'Baixa';
    }
    lines.push({ key: 'protein', label: 'Proteínas', value: v, unit: 'g', points: pts, maxPoints: 10, note });
  }

  // ── FIBRAS (5 pts bônus — desconta dos carbs) ────────────────────────────────
  {
    const v = n.fiber;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 4) {
      pts = 5; note = 'Fibras reduzem impacto glicêmico';
    } else {
      pts = 0; note = 'Abaixo de 4 g — bônus não atingido';
    }
    lines.push({ key: 'fiber', label: 'Fibras', value: v, unit: 'g', points: pts, maxPoints: 5, note });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { total, lines, disqualified: false };
}
