import { ComparisonResult, ExtractedProduct, GoalScore, NormalizedProduct, UserGoal } from '../../types';
import { normalize } from './normalize';
import { buildVerdict } from './verdict';
import { scoreWeightLoss } from './goals/weightLoss';
import { scoreMuscleGain } from './goals/muscleGain';
import { scoreDiabetes } from './goals/diabetes';
import { scoreLowCarb } from './goals/lowCarb';
import { scoreVegan } from './goals/vegan';
import { scoreGeneral } from './goals/general';

// Internal dispatcher — mirrors the public score() in index.ts.
// Kept here to avoid a circular dependency (index.ts imports compare.ts).
function applyScore(goal: UserGoal, p: NormalizedProduct): GoalScore {
  switch (goal) {
    case 'weight_loss': return scoreWeightLoss(p);
    case 'muscle_gain': return scoreMuscleGain(p);
    case 'diabetes':    return scoreDiabetes(p);
    case 'low_carb':    return scoreLowCarb(p);
    case 'vegan':       return scoreVegan(p);
    case 'general':     return scoreGeneral(p);
  }
}

function pickWinner(
  scoreA: GoalScore,
  scoreB: GoalScore,
): 'A' | 'B' | 'tie' {
  // Disqualified always loses; if both disqualified, the less-bad one wins
  if (scoreA.disqualified && !scoreB.disqualified) return 'B';
  if (!scoreA.disqualified && scoreB.disqualified) return 'A';

  // Both clear (or both disqualified) — compare totals
  if (scoreA.total > scoreB.total) return 'A';
  if (scoreB.total > scoreA.total) return 'B';
  return 'tie';
}

/**
 * Normalizes both products, scores them, picks the winner and builds the
 * human-readable verdict. Returns a fully populated ComparisonResult.
 *
 * Both products share the same normalization basis: if either one has an
 * unknown serving size the comparison note will make this transparent.
 */
export function compare(
  goal: UserGoal,
  a: ExtractedProduct,
  b: ExtractedProduct,
): ComparisonResult {
  const productA = normalize(a);
  const productB = normalize(b);
  const scoreA = applyScore(goal, productA);
  const scoreB = applyScore(goal, productB);
  const winner = pickWinner(scoreA, scoreB);
  const { verdict, keyReason } = buildVerdict(goal, productA, productB, scoreA, scoreB, winner);

  return {
    goal,
    productA,
    productB,
    scoreA,
    scoreB,
    winner,
    verdict,
    keyReason,
    createdAt: Date.now(),
  };
}
