import { GoalScore, NormalizedProduct, ScoreLine } from '../../../types';

/**
 * Scoring framework for the "Controle Glicêmico" (diabetes) goal.
 * Ported from the diabetes EXPERT_PROFILE in geminiService.ts.
 *
 * Total possible: 100 pts
 *   Açúcar Total          30 pts (critério eliminatório — açúcar > 10 g/100 g
 *                                 desqualifica o produto; pontos e linhas mantidos)
 *   Carboidratos Líquidos 25 pts (carbs - fibras)
 *   Fibras                20 pts
 *   Sódio                 15 pts
 *   Gorduras Saturadas    10 pts
 */
export function scoreDiabetes(p: NormalizedProduct): GoalScore {
  const lines: ScoreLine[] = [];
  const n = p.per100g;

  // ── AÇÚCAR TOTAL (30 pts — impacto glicêmico direto) ────────────────────────
  {
    const v = n.sugar;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 2) {
      pts = 30; note = 'Ideal para diabéticos';
    } else if (v < 5) {
      pts = 20; note = 'Bom';
    } else if (v < 8) {
      pts = 10; note = 'Moderado — consumo limitado';
    } else if (v < 12) {
      pts = 3; note = 'Ruim — eleva glicemia';
    } else {
      pts = 0; note = 'CONTRAINDICADO — eleva glicemia perigosamente';
    }
    lines.push({ key: 'sugar', label: 'Açúcar', value: v, unit: 'g', points: pts, maxPoints: 30, note });
  }

  // ── CARBOIDRATOS LÍQUIDOS (25 pts) ──────────────────────────────────────────
  // Carboidratos Líquidos = Carbs - Fibras (netCarbs já calculado na normalização)
  {
    const v = p.netCarbs;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 10) {
      pts = 25; note = 'Excelente controle glicêmico';
    } else if (v < 20) {
      pts = 16; note = 'Bom';
    } else if (v < 30) {
      pts = 8; note = 'Moderado';
    } else {
      pts = 2; note = 'Alto impacto glicêmico';
    }
    lines.push({
      key: 'netCarbs',
      label: 'Carboidratos Líquidos (Carbs - Fibras)',
      value: v,
      unit: 'g',
      points: pts,
      maxPoints: 25,
      note,
    });
  }

  // ── FIBRAS (20 pts — reduzem índice glicêmico) ──────────────────────────────
  {
    const v = n.fiber;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v > 6) {
      pts = 20; note = 'Excelente — retarda absorção de glicose';
    } else if (v >= 4) {
      pts = 14; note = 'Boa';
    } else if (v >= 2) {
      pts = 7; note = 'Moderada';
    } else {
      pts = 1; note = 'Insuficiente';
    }
    lines.push({ key: 'fiber', label: 'Fibras', value: v, unit: 'g', points: pts, maxPoints: 20, note });
  }

  // ── SÓDIO (15 pts — risco cardiovascular aumentado em diabéticos) ────────────
  {
    const v = n.sodium;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 200) {
      pts = 15; note = 'Excelente';
    } else if (v < 400) {
      pts = 10; note = 'Moderado';
    } else if (v < 600) {
      pts = 5; note = 'Alto';
    } else {
      pts = 0; note = 'Risco cardiovascular aumentado';
    }
    lines.push({ key: 'sodium', label: 'Sódio', value: v, unit: 'mg', points: pts, maxPoints: 15, note });
  }

  // ── GORDURAS SATURADAS (10 pts) ─────────────────────────────────────────────
  // Diabéticos têm maior risco de doenças cardíacas
  {
    const v = n.saturatedFats;
    let pts = 0;
    let note: string | undefined;
    if (v === null) {
      note = 'Não informado';
    } else if (v < 1.5) {
      pts = 10; note = 'Baixa';
    } else if (v < 3) {
      pts = 6; note = 'Moderada';
    } else {
      pts = 2; note = 'Alta — risco cardíaco elevado em diabéticos';
    }
    lines.push({ key: 'saturatedFats', label: 'Gorduras Saturadas', value: v, unit: 'g', points: pts, maxPoints: 10, note });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);

  // Açúcar > 10 g/100 g é contraindicado para diabéticos (critério eliminatório).
  // Mantemos total e lines para que, quando AMBOS os produtos forem contraindicados,
  // o menos ruim (maior total) vença — pickWinner compara totais nesse caso.
  const sugarValue = n.sugar;
  const disqualified = sugarValue !== null && sugarValue > 10;
  const disqualifyReason = disqualified
    ? `${sugarValue} g de açúcar/100 g — contraindicado para diabéticos`
    : undefined;

  return { total, lines, disqualified, disqualifyReason };
}
