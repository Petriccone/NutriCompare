// ============================================================================
// Public API for the deterministic scoring engine.
// All UI code should import from here, not from sub-modules.
// ============================================================================

import { ExtractedProduct, GoalScore, NormalizedProduct, UserGoal } from '../../types';
import { normalize as _normalize } from './normalize';
import { scoreWeightLoss } from './goals/weightLoss';
import { scoreMuscleGain } from './goals/muscleGain';
import { scoreDiabetes } from './goals/diabetes';
import { scoreLowCarb } from './goals/lowCarb';
import { scoreVegan } from './goals/vegan';
import { scoreGeneral } from './goals/general';

export { compare } from './compare';

/**
 * Convert a raw ExtractedProduct to a NormalizedProduct (per-100g basis).
 * See normalize.ts for full normalization rules.
 */
export function normalize(e: ExtractedProduct): NormalizedProduct {
  return _normalize(e);
}

/**
 * Score a NormalizedProduct for a specific user goal.
 * Returns a GoalScore with an auditable `lines` breakdown and a 0-100 total.
 */
export function score(goal: UserGoal, p: NormalizedProduct): GoalScore {
  switch (goal) {
    case 'weight_loss': return scoreWeightLoss(p);
    case 'muscle_gain': return scoreMuscleGain(p);
    case 'diabetes':    return scoreDiabetes(p);
    case 'low_carb':    return scoreLowCarb(p);
    case 'vegan':       return scoreVegan(p);
    case 'general':     return scoreGeneral(p);
  }
}
