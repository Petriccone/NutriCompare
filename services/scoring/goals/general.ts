import { GoalScore, NormalizedProduct, ScoreLine } from '../../../types';

/**
 * Scoring framework for the "Saúde Geral" (general health) goal.
 * Ported from the general EXPERT_PROFILE in geminiService.ts.
 *
 * Total possible: 100 pts
 *   Sódio                 20 pts (maior vilão dos ultraprocessados)
 *   Açúcar                20 pts
 *   Gorduras Saturadas    15 pts
 *   Fibras                15 pts
 *   Proteínas             15 pts
 *   Grau de Processamento 15 pts (ingredient count heuristic for NOVA classification)
 */
export function scoreGeneral(p: NormalizedProduct): GoalScore {
  const lines: ScoreLine[] = [];
  const n = p.per100g;

  // ── SÓDIO (20 pts — maior vilão dos ultraprocessados) ────────────────────────
  {
    const v = n.sodium;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 150) {
      pts = 20; note = 'Natural — muito baixo';
    } else if (v < 300) {
      pts = 14; note = 'Moderado';
    } else if (v < 500) {
      pts = 8; note = 'Alto';
    } else if (v < 800) {
      pts = 3; note = 'Muito alto';
    } else {
      pts = 0; note = 'Perigoso — hipertensão e retenção hídrica';
    }
    lines.push({ key: 'sodium', label: 'Sódio', value: v, unit: 'mg', points: pts, maxPoints: 20, note });
  }

  // ── AÇÚCAR (20 pts) ──────────────────────────────────────────────────────────
  {
    const v = n.sugar;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v <= 2) {
      pts = 20; note = 'Excelente';
    } else if (v < 5) {
      pts = 14; note = 'Baixo';
    } else if (v < 10) {
      pts = 7; note = 'Moderado';
    } else {
      pts = 0; note = 'Alto — prejudicial à saúde';
    }
    lines.push({ key: 'sugar', label: 'Açúcar', value: v, unit: 'g', points: pts, maxPoints: 20, note });
  }

  // ── GORDURAS SATURADAS (15 pts) ─────────────────────────────────────────────
  {
    const v = n.saturatedFats;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 1.5) {
      pts = 15; note = 'Excelente';
    } else if (v < 3) {
      pts = 10; note = 'Moderada';
    } else if (v < 5) {
      pts = 5; note = 'Alta';
    } else {
      pts = 1; note = 'Muito alta';
    }
    lines.push({ key: 'saturatedFats', label: 'Gorduras Saturadas', value: v, unit: 'g', points: pts, maxPoints: 15, note });
  }

  // ── FIBRAS (15 pts) ─────────────────────────────────────────────────────────
  {
    const v = n.fiber;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 5) {
      pts = 15; note = 'Excelente — saúde intestinal, glicemia e saciedade';
    } else if (v >= 3) {
      pts = 10; note = 'Boa';
    } else if (v >= 1) {
      pts = 5; note = 'Moderada';
    } else {
      pts = 0; note = 'Insuficiente';
    }
    lines.push({ key: 'fiber', label: 'Fibras', value: v, unit: 'g', points: pts, maxPoints: 15, note });
  }

  // ── PROTEÍNAS (15 pts) ──────────────────────────────────────────────────────
  {
    const v = n.protein;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 12) {
      pts = 15; note = 'Alta';
    } else if (v >= 6) {
      pts = 10; note = 'Boa';
    } else {
      pts = 4; note = 'Baixa';
    }
    lines.push({ key: 'protein', label: 'Proteínas', value: v, unit: 'g', points: pts, maxPoints: 15, note });
  }

  // ── GRAU DE PROCESSAMENTO (15 pts) ──────────────────────────────────────────
  // Heuristic using ingredient count to estimate NOVA classification.
  // 1 ingredient → NOVA 1 (in natura)
  // 2-3 → NOVA 2 (culinary ingredient)
  // 4-7 → NOVA 3 (processed)
  // 8+  → NOVA 4 (ultra-processed)
  {
    const count = p.ingredients.length;
    let pts = 0;
    let note: string | undefined;
    if (count === 0) {
      pts = 7; note = 'Lista de ingredientes não disponível (estimativa neutra)';
    } else if (count === 1) {
      pts = 15; note = 'Alimento in natura (NOVA 1)';
    } else if (count <= 3) {
      pts = 12; note = `${count} ingredientes — ingrediente culinário (NOVA 2)`;
    } else if (count <= 7) {
      pts = 7; note = `${count} ingredientes — processado (NOVA 3)`;
    } else {
      pts = 0; note = `${count} ingredientes — ultraprocessado (NOVA 4)`;
    }
    lines.push({
      key: 'processing',
      label: 'Grau de Processamento',
      value: count > 0 ? count : null,
      unit: 'ingredientes',
      points: pts,
      maxPoints: 15,
      note,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { total, lines, disqualified: false };
}
