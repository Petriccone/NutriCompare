import { ComparisonResult, GoalScore, NormalizedProduct, UserGoal } from '../../types';

const GOAL_LABELS: Record<UserGoal, string> = {
  weight_loss: 'Emagrecimento',
  muscle_gain: 'Ganho Muscular',
  diabetes: 'Controle Glicêmico',
  low_carb: 'Low Carb / Cetogênico',
  vegan: 'Vegano',
  general: 'Saúde Geral',
};

function fmt(v: number | null, unit: string, decimals = 1): string {
  if (v === null) return `? ${unit}`.trim();
  return `${v.toFixed(decimals)} ${unit}`.trim();
}

/**
 * Builds the human-readable verdict and keyReason strings from real numbers.
 * Both strings are templated — no vague language, always cite actual values.
 */
export function buildVerdict(
  goal: UserGoal,
  a: NormalizedProduct,
  b: NormalizedProduct,
  scoreA: GoalScore,
  scoreB: GoalScore,
  winner: 'A' | 'B' | 'tie',
): Pick<ComparisonResult, 'verdict' | 'keyReason'> {
  const goalLabel = GOAL_LABELS[goal];

  // ── Empate ──────────────────────────────────────────────────────────────────
  if (winner === 'tie') {
    return {
      verdict: `Empate em ${goalLabel}. Ambos os produtos somaram ${scoreA.total} pontos. Considere preço, preferência pessoal e outros fatores.`,
      keyReason: `Empate — ${scoreA.total} pts cada`,
    };
  }

  const winProduct = winner === 'A' ? a : b;
  const loseProduct = winner === 'A' ? b : a;
  const winScore = winner === 'A' ? scoreA : scoreB;
  const loseScore = winner === 'A' ? scoreB : scoreA;
  const winName = winProduct.productName;
  const loseName = loseProduct.productName;
  const diff = winScore.total - loseScore.total;

  // ── Disqualification ────────────────────────────────────────────────────────
  if (loseScore.disqualified && !winScore.disqualified) {
    const reason = loseScore.disqualifyReason ?? 'critério eliminatório';
    return {
      verdict:
        `"${winName}" vence para ${goalLabel}. "${loseName}" foi eliminado: ${reason}. ` +
        `Pontuação: ${winScore.total} vs ${loseScore.total} pts.`,
      keyReason: `"${loseName}" eliminado — ${reason}`,
    };
  }

  // ── Both disqualified ────────────────────────────────────────────────────────
  if (winScore.disqualified && loseScore.disqualified) {
    return {
      verdict:
        `Ambos os produtos foram desclassificados para ${goalLabel}, mas ` +
        `"${winName}" teve pontuação menos ruim (${winScore.total} vs ${loseScore.total} pts). ` +
        `Nenhum é recomendado para este objetivo.`,
      keyReason: `Ambos desclassificados — "${winName}" menos ruim`,
    };
  }

  // ── Regular winner with real numbers ────────────────────────────────────────
  const nW = winProduct.per100g;
  const nL = loseProduct.per100g;

  let details = '';
  let keyReason = `+${diff} pts — "${winName}" vence`;

  if (goal === 'weight_loss') {
    const sW = fmt(nW.sugar, 'g de açúcar');
    const sL = fmt(nL.sugar, 'g de açúcar');
    const pW = fmt(nW.protein, 'g de proteína');
    const pL = fmt(nL.protein, 'g de proteína');
    details = `${sW} vs ${sL} ("${loseName}"); proteína: ${pW} vs ${pL}.`;
    keyReason = `${sW} vs ${sL} de açúcar — ${diff > 0 ? `+${diff}` : diff} pts de vantagem`;
  } else if (goal === 'muscle_gain') {
    const pW = fmt(nW.protein, 'g de proteína');
    const pL = fmt(nL.protein, 'g de proteína');
    details = `Proteína: ${pW} ("${winName}") vs ${pL} ("${loseName}").`;
    keyReason = `${pW} vs ${pL} de proteína — +${diff} pts`;
  } else if (goal === 'diabetes') {
    const sW = fmt(nW.sugar, 'g de açúcar');
    const sL = fmt(nL.sugar, 'g de açúcar');
    const ncW = fmt(winProduct.netCarbs, 'g de carbs líquidos');
    const ncL = fmt(loseProduct.netCarbs, 'g de carbs líquidos');
    details = `Açúcar: ${sW} vs ${sL}; carbs líquidos: ${ncW} vs ${ncL} ("${loseName}").`;
    keyReason = `${sW} vs ${sL} de açúcar — +${diff} pts`;
  } else if (goal === 'low_carb') {
    const ncW = fmt(winProduct.netCarbs, 'g de carbs líquidos');
    const ncL = fmt(loseProduct.netCarbs, 'g de carbs líquidos');
    const sW = fmt(nW.sugar, 'g de açúcar');
    const sL = fmt(nL.sugar, 'g de açúcar');
    details = `Carbs líquidos: ${ncW} ("${winName}") vs ${ncL} ("${loseName}"); açúcar: ${sW} vs ${sL}.`;
    keyReason = `${ncW} vs ${ncL} de carbs líquidos — +${diff} pts`;
  } else if (goal === 'vegan') {
    const pW = fmt(nW.protein, 'g de proteína');
    const pL = fmt(nL.protein, 'g de proteína');
    const ingW = winProduct.ingredients.length;
    const ingL = loseProduct.ingredients.length;
    details = `Proteína: ${pW} vs ${pL}; ingredientes: ${ingW} vs ${ingL}.`;
    keyReason = `${pW} vs ${pL} de proteína — +${diff} pts`;
  } else if (goal === 'general') {
    const sodW = fmt(nW.sodium, 'mg de sódio');
    const sodL = fmt(nL.sodium, 'mg de sódio');
    const sW = fmt(nW.sugar, 'g de açúcar');
    const sL = fmt(nL.sugar, 'g de açúcar');
    details = `Sódio: ${sodW} vs ${sodL} ("${loseName}"); açúcar: ${sW} vs ${sL}.`;
    keyReason = `${sodW} vs ${sodL} de sódio — +${diff} pts`;
  }

  return {
    verdict:
      `"${winName}" é melhor para ${goalLabel} (+${diff} pts: ${winScore.total} vs ${loseScore.total}). ${details}`,
    keyReason,
  };
}
