// ============================================================================
// NutriCompare v2 — Shared data contract
// ============================================================================
// Design principle: the AI only READS labels (extraction). All scoring math is
// deterministic TypeScript in services/scoring/. Numbers are `number`, never
// `string`. Every value carries an explicit measurement basis so the engine can
// normalize both products to a common per-100g basis before comparing.
// ============================================================================

export type UserGoal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'diabetes'
  | 'low_carb'
  | 'vegan'
  | 'general';

export type AppStep =
  | 'ONBOARDING'
  | 'SCAN_A'
  | 'REVIEW_A'
  | 'SCAN_B'
  | 'REVIEW_B'
  | 'RESULT'
  | 'HISTORY';

// ---------------------------------------------------------------------------
// Raw nutrient values. Units are fixed and canonical:
//   calories = kcal · protein/carbs/sugar/fats/saturatedFats/fiber = grams
//   sodium = milligrams
// `null` means "not present / unreadable on the label" (distinct from 0).
// ---------------------------------------------------------------------------
export interface NutritionFacts {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fats: number | null;
  saturatedFats: number | null;
  fiber: number | null;
  sodium: number | null; // mg
}

export type MeasurementBasis = 'per_100g' | 'per_serving';

// What the extraction service (AI) returns for a single product, values exactly
// as printed on the label plus the basis needed to normalize them.
export interface ExtractedProduct {
  productName: string; // e.g. "Iogurte Natural Integral" or generic category
  category: string; // food category, e.g. "Iogurte"
  basis: MeasurementBasis; // basis of the numbers as read
  servingSizeG: number | null; // grams per serving if printed / known
  nutrition: NutritionFacts;
  ingredients: string[]; // parsed ingredient list (drives vegan + processing)
  confidence: 'high' | 'medium' | 'low';
  warnings: string[]; // e.g. ["Açúcar não encontrado no rótulo"]
}

// Product after normalization to a common per-100g basis. Consumed by scoring.
export interface NormalizedProduct {
  productName: string;
  category: string;
  per100g: NutritionFacts; // always normalized to 100 g
  netCarbs: number | null; // carbs - fiber (per 100 g), floored at 0
  ingredients: string[];
  isAnimalFree: boolean | null; // null = undetermined
  normalizationNote?: string; // e.g. "Sem tamanho de porção — comparado por porção"
}

// ---------------------------------------------------------------------------
// Deterministic scoring output. `lines` is the auditable, user-facing breakdown.
// ---------------------------------------------------------------------------
export interface ScoreLine {
  key: string; // criterion key, e.g. "sugar"
  label: string; // human label, e.g. "Açúcar"
  value: number | null; // per-100g value used in the calc
  unit: string; // "g" | "mg" | "kcal"
  points: number; // points earned for this criterion
  maxPoints: number; // maximum for this criterion
  note?: string; // e.g. "excelente" | "contraindicado"
}

export interface GoalScore {
  total: number; // 0–100
  lines: ScoreLine[];
  disqualified: boolean; // hard-fail (e.g. animal ingredient for vegan)
  disqualifyReason?: string;
}

export interface ComparisonResult {
  goal: UserGoal;
  productA: NormalizedProduct;
  productB: NormalizedProduct;
  scoreA: GoalScore;
  scoreB: GoalScore;
  winner: 'A' | 'B' | 'tie';
  verdict: string; // deterministic, cites real numbers
  keyReason: string; // short, punchy headline for the winner card
  createdAt: number; // epoch ms
}

// ---------------------------------------------------------------------------
// Local history (localStorage, no account).
// ---------------------------------------------------------------------------
export interface HistoryEntry {
  id: string;
  createdAt: number;
  goal: UserGoal;
  productAName: string;
  productBName: string;
  winner: 'A' | 'B' | 'tie';
  result: ComparisonResult; // full result for re-display
}

// ---------------------------------------------------------------------------
// Captured image payload passed from camera/upload to extraction.
// ---------------------------------------------------------------------------
export interface ImageFile {
  id: string;
  base64: string; // raw base64 (no data-URL prefix)
  mimeType: string; // e.g. "image/jpeg"
  previewUrl: string; // object URL or data URL for on-screen preview
}
