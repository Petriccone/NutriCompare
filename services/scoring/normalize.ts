import { ExtractedProduct, NormalizedProduct, NutritionFacts } from '../../types';

// ---------------------------------------------------------------------------
// Animal-derived ingredients that disqualify a product for the vegan goal.
// Ported from the vegan expert profile in geminiService.ts.
// ---------------------------------------------------------------------------
export const ANIMAL_INGREDIENTS: string[] = [
  // Carnes
  'frango', 'carne bovina', 'carne suína', 'boi', 'porco', 'suíno',
  'peixe', 'frutos do mar', 'atum', 'sardinha', 'bacalhau', 'salmão',
  'camarão', 'polvo', 'lula', 'mariscos', 'carne',
  'bacon', 'presunto', 'linguiça', 'salsicha', 'mortadela',
  // Laticínios
  'leite integral', 'leite desnatado', 'leite semidesnatado', 'leite em pó',
  'leite condensado', 'queijo', 'manteiga', 'creme de leite', 'iogurte',
  'lactose', 'caseína', 'whey', 'soro de leite', 'nata', 'requeijão', 'ricota',
  // Ovos
  'ovo', 'albumina', 'clara de ovo', 'gema de ovo',
  // Mel e derivados de abelha
  'mel', 'própolis', 'geleia real',
  // Outros derivados animais
  'gelatina', 'carmin', 'e120', 'suet', 'banha',
  'colágeno', 'l-cisteína', 'e920', 'lanolina',
];

// Known plant-based alternatives that contain animal-like keywords but are vegan.
// These are checked first to avoid false positives.
const PLANT_BASED_EXCEPTIONS = [
  /leite de coco/i,
  /leite de amêndoa/i,
  /leite de aveia/i,
  /leite de arroz/i,
  /leite de castanha/i,
  /leite de soja/i,
  /leite de macadâmia/i,
  /leite vegetal/i,
  /albumina de soja/i,
];

function isPlantBasedException(ingredient: string): boolean {
  return PLANT_BASED_EXCEPTIONS.some((re) => re.test(ingredient));
}

/**
 * Returns the first detected animal ingredient name, or null if none found.
 * Exported so the vegan scorer can include it in the disqualifyReason.
 */
export function detectAnimalIngredient(ingredients: string[]): string | null {
  if (!ingredients || ingredients.length === 0) return null;
  for (const ingredient of ingredients) {
    if (isPlantBasedException(ingredient)) continue;
    const lower = ingredient.toLowerCase();
    for (const animal of ANIMAL_INGREDIENTS) {
      if (lower.includes(animal.toLowerCase())) return animal;
    }
  }
  return null;
}

function deriveIsAnimalFree(ingredients: string[]): boolean | null {
  if (!ingredients || ingredients.length === 0) return null;
  return detectAnimalIngredient(ingredients) === null;
}

function scaleNutrition(nutrition: NutritionFacts, factor: number): NutritionFacts {
  const scale = (v: number | null): number | null =>
    v !== null ? parseFloat((v * factor).toFixed(4)) : null;
  return {
    calories: scale(nutrition.calories),
    protein: scale(nutrition.protein),
    carbs: scale(nutrition.carbs),
    sugar: scale(nutrition.sugar),
    fats: scale(nutrition.fats),
    saturatedFats: scale(nutrition.saturatedFats),
    fiber: scale(nutrition.fiber),
    sodium: scale(nutrition.sodium),
  };
}

/**
 * Converts an ExtractedProduct to a NormalizedProduct (per 100 g basis).
 *
 * Normalization rules:
 *   per_100g  → values used directly.
 *   per_serving + servingSizeG known → values * (100 / servingSizeG).
 *   per_serving + servingSizeG null  → values kept as-is, normalizationNote set.
 *
 * netCarbs = max(0, carbs - fiber).  null when carbs is null.
 * isAnimalFree derived from ingredient list; null when list is empty.
 */
export function normalize(e: ExtractedProduct): NormalizedProduct {
  let per100g: NutritionFacts;
  let normalizationNote: string | undefined;

  if (e.basis === 'per_100g') {
    per100g = { ...e.nutrition };
  } else if (e.basis === 'per_serving' && e.servingSizeG !== null && e.servingSizeG > 0) {
    per100g = scaleNutrition(e.nutrition, 100 / e.servingSizeG);
  } else {
    // per_serving with unknown (or zero) serving size — keep raw values
    per100g = { ...e.nutrition };
    normalizationNote =
      'Tamanho da porção não informado — valores comparados por porção (não por 100 g)';
  }

  const carbs = per100g.carbs;
  const fiber = per100g.fiber;
  const netCarbs =
    carbs !== null ? Math.max(0, carbs - (fiber ?? 0)) : null;

  return {
    productName: e.productName,
    category: e.category,
    per100g,
    netCarbs,
    ingredients: e.ingredients,
    isAnimalFree: deriveIsAnimalFree(e.ingredients),
    normalizationNote,
  };
}
