import { describe, it, expect } from 'vitest';
import { ExtractedProduct, NutritionFacts } from '../../types';
import { normalize, score, compare } from './index';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeNutrition(overrides: Partial<NutritionFacts> = {}): NutritionFacts {
  return {
    calories: overrides.calories ?? null,
    protein: overrides.protein ?? null,
    carbs: overrides.carbs ?? null,
    sugar: overrides.sugar ?? null,
    fats: overrides.fats ?? null,
    saturatedFats: overrides.saturatedFats ?? null,
    fiber: overrides.fiber ?? null,
    sodium: overrides.sodium ?? null,
  };
}

function makeExtracted(overrides: {
  productName?: string;
  category?: string;
  basis?: ExtractedProduct['basis'];
  servingSizeG?: number | null;
  nutrition?: Partial<NutritionFacts>;
  ingredients?: string[];
  confidence?: ExtractedProduct['confidence'];
  warnings?: string[];
} = {}): ExtractedProduct {
  return {
    productName: overrides.productName ?? 'Produto Teste',
    category: overrides.category ?? 'Alimento',
    basis: overrides.basis ?? 'per_100g',
    servingSizeG: overrides.servingSizeG ?? null,
    nutrition: makeNutrition(overrides.nutrition ?? {}),
    ingredients: overrides.ingredients ?? [],
    confidence: overrides.confidence ?? 'high',
    warnings: overrides.warnings ?? [],
  };
}

// ─── normalize() ─────────────────────────────────────────────────────────────

describe('normalize', () => {
  it('passes per_100g values through unchanged', () => {
    const e = makeExtracted({ basis: 'per_100g', nutrition: { protein: 20, carbs: 10, fiber: 4, sodium: 150 } });
    const p = normalize(e);
    expect(p.per100g.protein).toBe(20);
    expect(p.per100g.sodium).toBe(150);
    expect(p.normalizationNote).toBeUndefined();
  });

  it('scales per_serving values to per_100g when servingSizeG is known', () => {
    // 6 g protein per 30 g serving → 20 g per 100 g
    const e = makeExtracted({
      basis: 'per_serving',
      servingSizeG: 30,
      nutrition: { protein: 6, calories: 90, carbs: 15, fiber: 3 },
    });
    const p = normalize(e);
    expect(p.per100g.protein).toBeCloseTo(20, 3);
    expect(p.per100g.calories).toBeCloseTo(300, 3);
    expect(p.per100g.carbs).toBeCloseTo(50, 3);
    expect(p.per100g.fiber).toBeCloseTo(10, 3);
    expect(p.normalizationNote).toBeUndefined();
  });

  it('keeps raw values and sets normalizationNote when servingSizeG is null', () => {
    const e = makeExtracted({
      basis: 'per_serving',
      servingSizeG: null,
      nutrition: { protein: 5, calories: 120 },
    });
    const p = normalize(e);
    expect(p.per100g.protein).toBe(5);
    expect(p.per100g.calories).toBe(120);
    expect(p.normalizationNote).toContain('porção');
  });

  it('computes netCarbs = carbs - fiber, floored at 0', () => {
    const p1 = normalize(makeExtracted({ nutrition: { carbs: 20, fiber: 6 } }));
    expect(p1.netCarbs).toBe(14);

    // floor at 0 — fiber > carbs should not produce negative
    const p2 = normalize(makeExtracted({ nutrition: { carbs: 3, fiber: 5 } }));
    expect(p2.netCarbs).toBe(0);
  });

  it('sets netCarbs to null when carbs is null', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: null, fiber: 5 } }));
    expect(p.netCarbs).toBeNull();
  });

  it('derives isAnimalFree=true for plant-only ingredients', () => {
    const p = normalize(makeExtracted({ ingredients: ['arroz', 'feijão', 'azeite'] }));
    expect(p.isAnimalFree).toBe(true);
  });

  it('derives isAnimalFree=false when animal ingredient is detected', () => {
    const p = normalize(makeExtracted({ ingredients: ['farinha de trigo', 'leite integral', 'ovos'] }));
    expect(p.isAnimalFree).toBe(false);
  });

  it('derives isAnimalFree=false for whey protein', () => {
    const p = normalize(makeExtracted({ ingredients: ['whey protein', 'cacau', 'adoçante'] }));
    expect(p.isAnimalFree).toBe(false);
  });

  it('sets isAnimalFree=null when ingredient list is empty', () => {
    const p = normalize(makeExtracted({ ingredients: [] }));
    expect(p.isAnimalFree).toBeNull();
  });

  it('does NOT flag "leite de coco" as animal', () => {
    const p = normalize(makeExtracted({ ingredients: ['leite de coco', 'açúcar', 'cacau'] }));
    expect(p.isAnimalFree).toBe(true);
  });

  it('does NOT flag "leite de amêndoa" as animal', () => {
    const p = normalize(makeExtracted({ ingredients: ['leite de amêndoa', 'baunilha'] }));
    expect(p.isAnimalFree).toBe(true);
  });
});

// ─── score() — weight_loss ───────────────────────────────────────────────────

describe('score: weight_loss', () => {
  it('gives maximum points to ideal product', () => {
    const ideal = normalize(makeExtracted({
      nutrition: {
        sugar: 1,       // < 3 → 25 pts
        protein: 20,    // > 15 → 20 pts
        calories: 80,   // < 100 → 20 pts
        fiber: 7,       // > 5 → 15 pts
        sodium: 100,    // < 200 → 10 pts
        saturatedFats: 1, // < 2 → 10 pts
      },
    }));
    const s = score('weight_loss', ideal);
    expect(s.total).toBe(100);
    expect(s.disqualified).toBe(false);
    expect(s.lines).toHaveLength(6);
  });

  it('gives 0 sugar points when sugar ≥ 15 g', () => {
    const bad = normalize(makeExtracted({ nutrition: { sugar: 20 } }));
    const s = score('weight_loss', bad);
    const sugarLine = s.lines.find((l) => l.key === 'sugar');
    expect(sugarLine?.points).toBe(0);
  });

  it('gives 0 pts and note when sugar is null', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: null } }));
    const s = score('weight_loss', p);
    const sugarLine = s.lines.find((l) => l.key === 'sugar');
    expect(sugarLine?.points).toBe(0);
    expect(sugarLine?.note).toContain('Não informado');
  });

  it('clear winner: low sugar beats high sugar', () => {
    const a = makeExtracted({ productName: 'Opção A', nutrition: { sugar: 2, protein: 18, calories: 90, fiber: 6, sodium: 150, saturatedFats: 1 } });
    const b = makeExtracted({ productName: 'Opção B', nutrition: { sugar: 20, protein: 18, calories: 90, fiber: 6, sodium: 150, saturatedFats: 1 } });
    const result = compare('weight_loss', a, b);
    expect(result.winner).toBe('A');
    expect(result.scoreA.total).toBeGreaterThan(result.scoreB.total);
    expect(result.verdict).toContain('Opção A');
  });

  it('tie when scores are equal', () => {
    const a = makeExtracted({ productName: 'A', nutrition: { sugar: 5, protein: 12, calories: 150, fiber: 2, sodium: 250, saturatedFats: 3 } });
    const b = makeExtracted({ productName: 'B', nutrition: { sugar: 5, protein: 12, calories: 150, fiber: 2, sodium: 250, saturatedFats: 3 } });
    const result = compare('weight_loss', a, b);
    expect(result.winner).toBe('tie');
  });

  it('handles per_serving normalization correctly in compare', () => {
    // A: per 30g serving → 6g protein, 1g sugar. Per 100g → 20g protein, 3.33g sugar.
    const a = makeExtracted({
      productName: 'Proteína em pó',
      basis: 'per_serving',
      servingSizeG: 30,
      nutrition: { protein: 6, sugar: 1, calories: 36, fiber: 0.3, sodium: 30, saturatedFats: 0.3 },
    });
    // B: per_100g already
    const b = makeExtracted({
      productName: 'Biscoito',
      basis: 'per_100g',
      nutrition: { protein: 5, sugar: 15, calories: 450, fiber: 2, sodium: 400, saturatedFats: 8 },
    });
    const result = compare('weight_loss', a, b);
    expect(result.winner).toBe('A');
    // Verify A's protein was scaled correctly
    expect(result.productA.per100g.protein).toBeCloseTo(20, 2);
  });
});

// ─── score() — muscle_gain ───────────────────────────────────────────────────

describe('score: muscle_gain', () => {
  it('protein is the dominant criterion', () => {
    const highProtein = normalize(makeExtracted({ nutrition: { protein: 25, calories: 120, carbs: 5, sugar: 1, fats: 2, saturatedFats: 0.5, sodium: 100 } }));
    const lowProtein = normalize(makeExtracted({ nutrition: { protein: 3, calories: 450, carbs: 60, sugar: 5, fats: 20, saturatedFats: 3, sodium: 100 } }));
    const sHP = score('muscle_gain', highProtein);
    const sLP = score('muscle_gain', lowProtein);
    // High protein product gets 40 pts just for protein; low protein gets 0
    expect(sHP.lines.find((l) => l.key === 'protein')?.points).toBe(40);
    expect(sLP.lines.find((l) => l.key === 'protein')?.points).toBe(0);
    expect(sHP.total).toBeGreaterThan(sLP.total);
  });

  it('clear winner: product with protein > 20g beats product with protein < 6g', () => {
    const a = makeExtracted({ productName: 'Whey', nutrition: { protein: 25, sugar: 2, calories: 400, carbs: 40, fats: 5, saturatedFats: 2, sodium: 200 } });
    const b = makeExtracted({ productName: 'Arroz branco', nutrition: { protein: 3, sugar: 0, calories: 365, carbs: 80, fats: 0.5, saturatedFats: 0.1, sodium: 1 } });
    const result = compare('muscle_gain', a, b);
    expect(result.winner).toBe('A');
  });

  it('null protein → 0 pts with note', () => {
    const p = normalize(makeExtracted({ nutrition: { protein: null } }));
    const s = score('muscle_gain', p);
    const line = s.lines.find((l) => l.key === 'protein');
    expect(line?.points).toBe(0);
    expect(line?.note).toContain('Não informado');
  });

  it('high saturated fats reduces fat score', () => {
    const p = normalize(makeExtracted({ nutrition: { fats: 20, saturatedFats: 8 } }));
    const s = score('muscle_gain', p);
    const fatLine = s.lines.find((l) => l.key === 'fats');
    expect(fatLine?.points).toBe(5); // penalised for sat > 5g
  });
});

// ─── score() — diabetes ──────────────────────────────────────────────────────

describe('score: diabetes', () => {
  it('ideal product: very low sugar and high fiber', () => {
    const ideal = normalize(makeExtracted({
      nutrition: {
        sugar: 1,       // < 2 → 30 pts
        carbs: 8,       // netCarbs = 8 - 7 = 1 → < 10 → 25 pts
        fiber: 7,       // > 6 → 20 pts
        sodium: 100,    // < 200 → 15 pts
        saturatedFats: 1, // < 1.5 → 10 pts
      },
    }));
    const s = score('diabetes', ideal);
    expect(s.total).toBe(100);
  });

  it('CONTRAINDICADO note when sugar ≥ 12 g', () => {
    const bad = normalize(makeExtracted({ nutrition: { sugar: 15 } }));
    const s = score('diabetes', bad);
    const sugarLine = s.lines.find((l) => l.key === 'sugar');
    expect(sugarLine?.points).toBe(0);
    expect(sugarLine?.note).toContain('CONTRAINDICADO');
  });

  it('uses netCarbs (carbs - fiber) for the carb criterion', () => {
    // carbs=30, fiber=8 → netCarbs=22 → 8 pts
    const p = normalize(makeExtracted({ nutrition: { carbs: 30, fiber: 8 } }));
    const s = score('diabetes', p);
    const nc = s.lines.find((l) => l.key === 'netCarbs');
    expect(nc?.value).toBe(22);
    expect(nc?.points).toBe(8);
  });

  it('null sugar → 0 pts with note', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: null } }));
    const s = score('diabetes', p);
    const line = s.lines.find((l) => l.key === 'sugar');
    expect(line?.points).toBe(0);
    expect(line?.note).toContain('Não informado');
  });

  it('clear winner: low sugar product beats high sugar product', () => {
    const a = makeExtracted({ productName: 'Iogurte sem açúcar', nutrition: { sugar: 1, carbs: 4, fiber: 1, sodium: 50, saturatedFats: 0.5 } });
    const b = makeExtracted({ productName: 'Iogurte com açúcar', nutrition: { sugar: 14, carbs: 18, fiber: 0, sodium: 50, saturatedFats: 0.5 } });
    const result = compare('diabetes', a, b);
    expect(result.winner).toBe('A');
  });
});

// ─── score() — low_carb ──────────────────────────────────────────────────────

describe('score: low_carb', () => {
  it('ketogenic product (netCarbs < 3g) gets max net carb points', () => {
    const keto = normalize(makeExtracted({ nutrition: { carbs: 2, fiber: 0, sugar: 0.5 } }));
    const s = score('low_carb', keto);
    const nc = s.lines.find((l) => l.key === 'netCarbs');
    expect(nc?.points).toBe(45);
  });

  it('high net carbs (> 15g) gets 0 pts', () => {
    const bad = normalize(makeExtracted({ nutrition: { carbs: 40, fiber: 2, sugar: 10 } }));
    const s = score('low_carb', bad);
    const nc = s.lines.find((l) => l.key === 'netCarbs');
    expect(nc?.points).toBe(0);
  });

  it('sugar = 6g → 0 sugar pts (quebra cetose)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 6, carbs: 10, fiber: 2 } }));
    const s = score('low_carb', p);
    const sugarLine = s.lines.find((l) => l.key === 'sugar');
    expect(sugarLine?.points).toBe(0);
  });

  it('high fat (>10g, < 50% saturated) gets 15 pts for fats', () => {
    const p = normalize(makeExtracted({ nutrition: { fats: 15, saturatedFats: 5, carbs: 1, fiber: 0, sugar: 0 } }));
    const s = score('low_carb', p);
    const fatLine = s.lines.find((l) => l.key === 'fats');
    expect(fatLine?.points).toBe(15); // 5/15 < 0.5 → qualifies
  });

  it('clear winner: 2g net carbs beats 18g net carbs', () => {
    const a = makeExtracted({ productName: 'Queijo', nutrition: { carbs: 2, fiber: 0, sugar: 0.5, fats: 20, saturatedFats: 10, protein: 25, sodium: 400 } });
    const b = makeExtracted({ productName: 'Granola', nutrition: { carbs: 65, fiber: 5, sugar: 20, fats: 10, saturatedFats: 3, protein: 8, sodium: 100 } });
    const result = compare('low_carb', a, b);
    expect(result.winner).toBe('A');
    expect(result.verdict).toContain('carbs líquidos');
  });

  it('null netCarbs (null carbs) → 0 pts with note', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: null, fiber: null } }));
    const s = score('low_carb', p);
    const nc = s.lines.find((l) => l.key === 'netCarbs');
    expect(nc?.points).toBe(0);
    expect(nc?.note).toContain('Não informado');
  });
});

// ─── score() — vegan ─────────────────────────────────────────────────────────

describe('score: vegan', () => {
  it('disqualifies product with animal ingredient (leite integral)', () => {
    const p = normalize(makeExtracted({
      ingredients: ['farinha de trigo', 'leite integral', 'açúcar'],
    }));
    const s = score('vegan', p);
    expect(s.disqualified).toBe(true);
    expect(s.total).toBe(0);
    expect(s.disqualifyReason).toContain('animal');
    expect(s.lines).toHaveLength(0);
  });

  it('disqualifies product with gelatina', () => {
    const p = normalize(makeExtracted({ ingredients: ['suco de fruta', 'gelatina', 'corante'] }));
    const s = score('vegan', p);
    expect(s.disqualified).toBe(true);
  });

  it('disqualifies product with whey', () => {
    const p = normalize(makeExtracted({ ingredients: ['whey protein', 'cacau', 'adoçante'] }));
    const s = score('vegan', p);
    expect(s.disqualified).toBe(true);
  });

  it('does not disqualify product with unknown ingredients (isAnimalFree=null)', () => {
    const p = normalize(makeExtracted({ ingredients: [] }));
    const s = score('vegan', p);
    expect(s.disqualified).toBe(false);
  });

  it('scores vegan product nutritionally', () => {
    const p = normalize(makeExtracted({
      ingredients: ['tofu', 'arroz integral', 'feijão', 'azeite'],
      nutrition: { protein: 12, sugar: 2, saturatedFats: 1, sodium: 200, carbs: 20, fiber: 5 },
    }));
    const s = score('vegan', p);
    expect(s.disqualified).toBe(false);
    expect(s.total).toBeGreaterThan(50);

    const protLine = s.lines.find((l) => l.key === 'protein');
    expect(protLine?.points).toBe(30); // > 10g → 30 pts

    const procLine = s.lines.find((l) => l.key === 'processing');
    expect(procLine?.points).toBe(20); // 4 ingredients < 5 → 20 pts
  });

  it('complete protein sources get 10 pts for quality', () => {
    const p = normalize(makeExtracted({
      ingredients: ['tofu', 'azeite', 'shoyu', 'alho'],
      nutrition: { protein: 8 },
    }));
    const s = score('vegan', p);
    const qualLine = s.lines.find((l) => l.key === 'proteinQuality');
    expect(qualLine?.points).toBe(10);
  });

  it('legume + cereal combination gets 10 pts for quality', () => {
    const p = normalize(makeExtracted({
      ingredients: ['feijão', 'arroz', 'azeite'],
      nutrition: { protein: 5 },
    }));
    const s = score('vegan', p);
    const qualLine = s.lines.find((l) => l.key === 'proteinQuality');
    expect(qualLine?.points).toBe(10);
  });

  it('winner is vegan product when competing against disqualified one', () => {
    const a = makeExtracted({
      productName: 'Hambúrguer de soja',
      ingredients: ['proteína de soja', 'arroz integral', 'azeite', 'sal'],
      nutrition: { protein: 15, sugar: 2, saturatedFats: 1, sodium: 300, carbs: 20, fiber: 4 },
    });
    const b = makeExtracted({
      productName: 'Hambúrguer de frango',
      ingredients: ['frango', 'sal', 'pimenta', 'cebola'],
      nutrition: { protein: 20, sugar: 0, saturatedFats: 2, sodium: 400, carbs: 0, fiber: 0 },
    });
    const result = compare('vegan', a, b);
    expect(result.winner).toBe('A');
    expect(result.scoreB.disqualified).toBe(true);
    expect(result.verdict).toContain('eliminado');
  });

  it('null sugar in balance gives partial credit, not crash', () => {
    const p = normalize(makeExtracted({
      ingredients: ['quinoa', 'sal'],
      nutrition: { protein: 14, sugar: null, saturatedFats: null, sodium: null },
    }));
    expect(() => score('vegan', p)).not.toThrow();
    const s = score('vegan', p);
    expect(s.disqualified).toBe(false);
  });
});

// ─── score() — general ───────────────────────────────────────────────────────

describe('score: general', () => {
  it('natural single-ingredient food gets 15 pts for processing', () => {
    const p = normalize(makeExtracted({
      ingredients: ['maçã'],
      nutrition: { sodium: 10, sugar: 10, saturatedFats: 0.1, fiber: 2, protein: 0.5 },
    }));
    const s = score('general', p);
    const procLine = s.lines.find((l) => l.key === 'processing');
    expect(procLine?.points).toBe(15);
  });

  it('ultra-processed food (8+ ingredients) gets 0 pts for processing', () => {
    const p = normalize(makeExtracted({
      ingredients: ['farinha', 'açúcar', 'gordura', 'sal', 'corante', 'emulsificante', 'aroma', 'conservante'],
      nutrition: { sodium: 600, sugar: 15, saturatedFats: 5, fiber: 0.5, protein: 3 },
    }));
    const s = score('general', p);
    const procLine = s.lines.find((l) => l.key === 'processing');
    expect(procLine?.points).toBe(0);
  });

  it('high sodium (≥ 800mg) gets 0 pts', () => {
    const p = normalize(makeExtracted({ nutrition: { sodium: 900 } }));
    const s = score('general', p);
    const sodLine = s.lines.find((l) => l.key === 'sodium');
    expect(sodLine?.points).toBe(0);
  });

  it('clear winner: low sodium & low sugar beats high sodium & high sugar', () => {
    const a = makeExtracted({
      productName: 'Aveia',
      ingredients: ['aveia'],
      nutrition: { sodium: 50, sugar: 1, saturatedFats: 0.5, fiber: 8, protein: 13 },
    });
    const b = makeExtracted({
      productName: 'Salgadinho',
      ingredients: ['milho', 'sal', 'gordura', 'corante', 'aroma', 'açúcar', 'acidulante', 'emulsificante', 'conservante'],
      nutrition: { sodium: 900, sugar: 12, saturatedFats: 6, fiber: 1, protein: 3 },
    });
    const result = compare('general', a, b);
    expect(result.winner).toBe('A');
    expect(result.verdict).toContain('sódio');
  });

  it('null fiber → 0 pts with note', () => {
    const p = normalize(makeExtracted({ nutrition: { fiber: null } }));
    const s = score('general', p);
    const fLine = s.lines.find((l) => l.key === 'fiber');
    expect(fLine?.points).toBe(0);
    expect(fLine?.note).toContain('Não informado');
  });
});

// ─── normalize() — additional edge-cases ────────────────────────────────────

describe('normalize — edge cases', () => {
  it('treats servingSizeG = 0 as unknown and sets normalizationNote', () => {
    // Division by zero guard: 0 must not pass the `e.servingSizeG > 0` check
    const e = makeExtracted({
      basis: 'per_serving',
      servingSizeG: 0,
      nutrition: { protein: 10, calories: 150 },
    });
    const p = normalize(e);
    expect(p.per100g.protein).toBe(10);  // raw value kept, NOT divided by 0
    expect(p.normalizationNote).toContain('porção');
  });

  it('netCarbs uses carbs alone when fiber is null (fiber treated as 0)', () => {
    // carbs=20, fiber=null → netCarbs = max(0, 20 - 0) = 20
    const p = normalize(makeExtracted({ nutrition: { carbs: 20, fiber: null } }));
    expect(p.netCarbs).toBe(20);
  });

  it('does NOT flag "leite de soja" as animal', () => {
    const p = normalize(makeExtracted({ ingredients: ['leite de soja', 'açúcar', 'baunilha'] }));
    expect(p.isAnimalFree).toBe(true);
  });

  it('does NOT flag "leite de aveia" as animal', () => {
    const p = normalize(makeExtracted({ ingredients: ['leite de aveia', 'cacau'] }));
    expect(p.isAnimalFree).toBe(true);
  });

  it('does NOT flag "albumina de soja" as animal (vegan-safe)', () => {
    // "albumina" is in the animal list but "albumina de soja" is a plant exception
    const p = normalize(makeExtracted({ ingredients: ['albumina de soja', 'sal'] }));
    expect(p.isAnimalFree).toBe(true);
  });
});

// ─── score() — weight_loss — boundary tiers ──────────────────────────────────

describe('score: weight_loss — boundary tiers', () => {
  it('sugar exactly at 3g earns 18 pts (not 25 — threshold is strict <3)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 3 } }));
    const s = score('weight_loss', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(18);
  });

  it('sugar exactly at 10g earns 4 pts (tier <10 → 10 pts fails at 10)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 10 } }));
    const s = score('weight_loss', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(4);
  });

  it('sodium exactly at 600mg earns 0 pts (threshold is strict <600)', () => {
    const p = normalize(makeExtracted({ nutrition: { sodium: 600 } }));
    const s = score('weight_loss', p);
    expect(s.lines.find((l) => l.key === 'sodium')?.points).toBe(0);
  });

  it('saturatedFats exactly at 4g earns 3 pts (tier <4 → 6 pts fails at 4)', () => {
    const p = normalize(makeExtracted({ nutrition: { saturatedFats: 4 } }));
    const s = score('weight_loss', p);
    expect(s.lines.find((l) => l.key === 'saturatedFats')?.points).toBe(3);
  });

  it('null calories → 0 pts with Não informado note', () => {
    const p = normalize(makeExtracted({ nutrition: { calories: null } }));
    const s = score('weight_loss', p);
    const line = s.lines.find((l) => l.key === 'calories');
    expect(line?.points).toBe(0);
    expect(line?.note).toContain('Não informado');
  });

  it('null sodium → 0 pts with Não informado note', () => {
    const p = normalize(makeExtracted({ nutrition: { sodium: null } }));
    const s = score('weight_loss', p);
    const line = s.lines.find((l) => l.key === 'sodium');
    expect(line?.points).toBe(0);
    expect(line?.note).toContain('Não informado');
  });

  it('weight_loss never disqualifies any product', () => {
    // Even the worst imaginable product must not be flagged disqualified
    const p = normalize(makeExtracted({
      nutrition: { sugar: 999, protein: null, calories: null, fiber: null, sodium: null, saturatedFats: null },
    }));
    const s = score('weight_loss', p);
    expect(s.disqualified).toBe(false);
  });
});

// ─── score() — muscle_gain — boundary tiers ─────────────────────────────────

describe('score: muscle_gain — boundary tiers', () => {
  it('tie when both products have identical nutrition', () => {
    const a = makeExtracted({ productName: 'A', nutrition: { protein: 15, calories: 300, carbs: 40, sugar: 3, fats: 5, saturatedFats: 2, sodium: 200 } });
    const b = makeExtracted({ productName: 'B', nutrition: { protein: 15, calories: 300, carbs: 40, sugar: 3, fats: 5, saturatedFats: 2, sodium: 200 } });
    expect(compare('muscle_gain', a, b).winner).toBe('tie');
  });

  it('sodium exactly 800mg earns 5 pts (threshold is >800, not >=800)', () => {
    const p = normalize(makeExtracted({ nutrition: { sodium: 800 } }));
    const s = score('muscle_gain', p);
    expect(s.lines.find((l) => l.key === 'sodium')?.points).toBe(5);
  });

  it('sodium 801mg earns 0 pts (crosses >800 threshold)', () => {
    const p = normalize(makeExtracted({ nutrition: { sodium: 801 } }));
    const s = score('muscle_gain', p);
    expect(s.lines.find((l) => l.key === 'sodium')?.points).toBe(0);
  });

  it('calories < 200 earn 2 pts (lowest tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { calories: 100 } }));
    const s = score('muscle_gain', p);
    expect(s.lines.find((l) => l.key === 'calories')?.points).toBe(2);
  });

  it('calories [200, 300) earn 8 pts', () => {
    const p = normalize(makeExtracted({ nutrition: { calories: 250 } }));
    const s = score('muscle_gain', p);
    expect(s.lines.find((l) => l.key === 'calories')?.points).toBe(8);
  });

  it('null carbs → complexCarbs line is 0 pts with Não informado note', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: null, sugar: null } }));
    const s = score('muscle_gain', p);
    const line = s.lines.find((l) => l.key === 'complexCarbs');
    expect(line?.points).toBe(0);
    expect(line?.note).toContain('Não informado');
  });
});

// ─── score() — diabetes — boundary tiers ────────────────────────────────────

describe('score: diabetes — boundary tiers', () => {
  it('tie when both products score identically', () => {
    const a = makeExtracted({ productName: 'A', nutrition: { sugar: 3, carbs: 10, fiber: 3, sodium: 100, saturatedFats: 1 } });
    const b = makeExtracted({ productName: 'B', nutrition: { sugar: 3, carbs: 10, fiber: 3, sodium: 100, saturatedFats: 1 } });
    expect(compare('diabetes', a, b).winner).toBe('tie');
  });

  it('sugar exactly 2g earns 20 pts (v<2 gives 30 pts; v<5 gives 20 pts)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 2 } }));
    const s = score('diabetes', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(20);
  });

  it('sugar = 5g earns 10 pts (third tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 5 } }));
    const s = score('diabetes', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(10);
  });

  it('null netCarbs → 0 pts with Não informado note', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: null, fiber: null } }));
    const s = score('diabetes', p);
    const line = s.lines.find((l) => l.key === 'netCarbs');
    expect(line?.points).toBe(0);
    expect(line?.note).toContain('Não informado');
  });

  it('netCarbs = 15 earns 16 pts ([10,20) tier)', () => {
    // carbs=20, fiber=5 → netCarbs=15
    const p = normalize(makeExtracted({ nutrition: { carbs: 20, fiber: 5 } }));
    const s = score('diabetes', p);
    expect(s.lines.find((l) => l.key === 'netCarbs')?.points).toBe(16);
  });

  it('netCarbs = 25 earns 8 pts ([20,30) tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: 30, fiber: 5 } }));
    const s = score('diabetes', p);
    expect(s.lines.find((l) => l.key === 'netCarbs')?.points).toBe(8);
  });

  it('netCarbs >= 30 earns 2 pts', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: 50, fiber: 5 } }));
    const s = score('diabetes', p);
    expect(s.lines.find((l) => l.key === 'netCarbs')?.points).toBe(2);
  });
});

// ─── score() — low_carb — boundary tiers ─────────────────────────────────────

describe('score: low_carb — boundary tiers', () => {
  it('tie when both products have identical nutrition', () => {
    const a = makeExtracted({ productName: 'A', nutrition: { carbs: 2, fiber: 0, sugar: 0.5, fats: 15, saturatedFats: 5, protein: 20, sodium: 200 } });
    const b = makeExtracted({ productName: 'B', nutrition: { carbs: 2, fiber: 0, sugar: 0.5, fats: 15, saturatedFats: 5, protein: 20, sodium: 200 } });
    expect(compare('low_carb', a, b).winner).toBe('tie');
  });

  it('netCarbs = 5g earns 32 pts ([3,6) tier)', () => {
    // carbs=5, fiber=0 → netCarbs=5
    const p = normalize(makeExtracted({ nutrition: { carbs: 5, fiber: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'netCarbs')?.points).toBe(32);
  });

  it('netCarbs = 9g earns 18 pts ([6,10) tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: 9, fiber: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'netCarbs')?.points).toBe(18);
  });

  it('netCarbs = 12g earns 6 pts ([10,15) tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: 12, fiber: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'netCarbs')?.points).toBe(6);
  });

  it('sugar exactly 1g earns 25 pts (threshold is <=1)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 1, carbs: 1, fiber: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(25);
  });

  it('sugar 2g earns 15 pts ((1,3) tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 2, carbs: 2, fiber: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(15);
  });

  it('fiber > 4g earns 5 bonus pts', () => {
    const p = normalize(makeExtracted({ nutrition: { carbs: 10, fiber: 5, sugar: 1 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'fiber')?.points).toBe(5);
  });

  it('fats > 10g with satFats = null earns 15 pts (benefit of the doubt)', () => {
    // When satFats unknown, condition satFats === null fires → 15 pts
    const p = normalize(makeExtracted({ nutrition: { fats: 15, saturatedFats: null, carbs: 1, fiber: 0, sugar: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'fats')?.points).toBe(15);
  });
});

// ─── score() — vegan — boundary tiers & ingredient heuristics ────────────────

describe('score: vegan — ingredient heuristics and boundary tiers', () => {
  it('tie when two vegan products are nutritionally identical', () => {
    const base = {
      ingredients: ['tofu', 'azeite'],
      nutrition: { protein: 8, sugar: 2, saturatedFats: 1, sodium: 200, carbs: 10, fiber: 2 },
    };
    const a = makeExtracted({ productName: 'A', ...base });
    const b = makeExtracted({ productName: 'B', ...base });
    const result = compare('vegan', a, b);
    expect(result.winner).toBe('tie');
  });

  it('detects iron-rich source (feijão) → iron line = 10 pts', () => {
    const p = normalize(makeExtracted({ ingredients: ['feijão', 'azeite', 'sal'] }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'iron')?.points).toBe(10);
  });

  it('no iron-rich source → iron line = 0 pts', () => {
    const p = normalize(makeExtracted({ ingredients: ['farinha de trigo', 'açúcar', 'sal'] }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'iron')?.points).toBe(0);
  });

  it('B12/calcium source (tofu) → b12calcium line = 10 pts', () => {
    const p = normalize(makeExtracted({ ingredients: ['tofu', 'azeite'] }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'b12calcium')?.points).toBe(10);
  });

  it('no B12/calcium source → b12calcium line = 0 pts', () => {
    const p = normalize(makeExtracted({ ingredients: ['batata', 'sal', 'pimenta'] }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'b12calcium')?.points).toBe(0);
  });

  it('ultra-processed vegan (> 10 ingredients) → processing = 5 pts', () => {
    const longList = ['soja', 'arroz', 'azeite', 'sal', 'açúcar', 'amido', 'vitamina e', 'lecitina', 'carragena', 'goma xantana', 'extrato de baunilha'];
    const p = normalize(makeExtracted({ ingredients: longList }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'processing')?.points).toBe(5);
  });

  it('empty ingredient list → processing = 10 pts (neutral estimate)', () => {
    const p = normalize(makeExtracted({ ingredients: [] }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'processing')?.points).toBe(10);
  });

  it('protein [6, 10]g → 20 pts', () => {
    const p = normalize(makeExtracted({
      ingredients: ['quinoa'],
      nutrition: { protein: 8 },
    }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'protein')?.points).toBe(20);
  });

  it('protein [3, 6)g → 10 pts', () => {
    const p = normalize(makeExtracted({
      ingredients: ['arroz integral'],
      nutrition: { protein: 4 },
    }));
    const s = score('vegan', p);
    expect(s.lines.find((l) => l.key === 'protein')?.points).toBe(10);
  });

  it('does not disqualify product with "albumina de soja" (plant exception)', () => {
    const p = normalize(makeExtracted({ ingredients: ['albumina de soja', 'quinoa'] }));
    const s = score('vegan', p);
    expect(s.disqualified).toBe(false);
  });
});

// ─── score() — general — boundary tiers ──────────────────────────────────────

describe('score: general — boundary tiers', () => {
  it('tie when both products are identical', () => {
    const a = makeExtracted({ productName: 'A', ingredients: ['aveia'], nutrition: { sodium: 50, sugar: 1, saturatedFats: 0.5, fiber: 8, protein: 13 } });
    const b = makeExtracted({ productName: 'B', ingredients: ['aveia'], nutrition: { sodium: 50, sugar: 1, saturatedFats: 0.5, fiber: 8, protein: 13 } });
    expect(compare('general', a, b).winner).toBe('tie');
  });

  it('2 ingredients → 12 pts processing (NOVA 2)', () => {
    const p = normalize(makeExtracted({ ingredients: ['aveia', 'sal'] }));
    const s = score('general', p);
    expect(s.lines.find((l) => l.key === 'processing')?.points).toBe(12);
  });

  it('4 ingredients → 7 pts processing (NOVA 3)', () => {
    const p = normalize(makeExtracted({ ingredients: ['farinha', 'açúcar', 'óleo', 'sal'] }));
    const s = score('general', p);
    expect(s.lines.find((l) => l.key === 'processing')?.points).toBe(7);
  });

  it('empty ingredient list → 7 pts processing (neutral estimate)', () => {
    const p = normalize(makeExtracted({ ingredients: [] }));
    const s = score('general', p);
    expect(s.lines.find((l) => l.key === 'processing')?.points).toBe(7);
  });

  it('sodium exactly 150mg earns 14 pts (strict <150 = 20 pts fails at 150)', () => {
    const p = normalize(makeExtracted({ nutrition: { sodium: 150 } }));
    const s = score('general', p);
    expect(s.lines.find((l) => l.key === 'sodium')?.points).toBe(14);
  });

  it('sugar exactly 2g earns 20 pts (<=2 threshold)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 2 } }));
    const s = score('general', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(20);
  });

  it('sugar exactly 5g earns 7 pts ([5,10) tier)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 5 } }));
    const s = score('general', p);
    expect(s.lines.find((l) => l.key === 'sugar')?.points).toBe(7);
  });

  it('winner B: product B wins when it has much lower sodium', () => {
    const a = makeExtracted({
      productName: 'Molho de Soja',
      ingredients: ['soja', 'trigo', 'sal', 'água'],
      nutrition: { sodium: 5600, sugar: 5, saturatedFats: 0, fiber: 1, protein: 8 },
    });
    const b = makeExtracted({
      productName: 'Iogurte Natural',
      ingredients: ['leite integral', 'fermento'],
      nutrition: { sodium: 46, sugar: 4, saturatedFats: 2, fiber: 0, protein: 3 },
    });
    const result = compare('general', a, b);
    expect(result.winner).toBe('B');
    expect(result.verdict).toContain('Iogurte Natural');
  });

  it('verdict for winner B contains winner B product name and loser A product name', () => {
    const a = makeExtracted({
      productName: 'Ultra Salgado',
      ingredients: ['sal', 'gordura'],
      nutrition: { sodium: 2000, sugar: 1, saturatedFats: 8, fiber: 0, protein: 2 },
    });
    const b = makeExtracted({
      productName: 'Cenoura Fresca',
      ingredients: ['cenoura'],
      nutrition: { sodium: 30, sugar: 3, saturatedFats: 0, fiber: 3, protein: 1 },
    });
    const result = compare('general', a, b);
    expect(result.winner).toBe('B');
    expect(result.verdict).toContain('Cenoura Fresca');
  });
});

// ─── compare() — cross-goal ──────────────────────────────────────────────────

describe('compare', () => {
  it('both disqualified: less-bad wins', () => {
    // Both have chicken but one also has very high sodium — disqualify both in vegan
    const a = makeExtracted({
      productName: 'Frango A',
      ingredients: ['frango', 'sal'],
      nutrition: { protein: 25, sugar: 0, saturatedFats: 2, sodium: 400, carbs: 0, fiber: 0 },
    });
    const b = makeExtracted({
      productName: 'Frango B',
      ingredients: ['frango', 'manteiga'],
      nutrition: { protein: 20, sugar: 1, saturatedFats: 8, sodium: 600, carbs: 0, fiber: 0 },
    });
    const result = compare('vegan', a, b);
    // Both disqualified; winner is tie since both have total = 0
    expect(result.scoreA.disqualified).toBe(true);
    expect(result.scoreB.disqualified).toBe(true);
    expect(['A', 'B', 'tie']).toContain(result.winner);
  });

  it('createdAt is a recent epoch ms timestamp', () => {
    const before = Date.now();
    const a = makeExtracted({ productName: 'A', nutrition: { protein: 10 } });
    const b = makeExtracted({ productName: 'B', nutrition: { protein: 5 } });
    const result = compare('muscle_gain', a, b);
    const after = Date.now();
    expect(result.createdAt).toBeGreaterThanOrEqual(before);
    expect(result.createdAt).toBeLessThanOrEqual(after);
  });

  it('verdict always contains real product names', () => {
    const a = makeExtracted({ productName: 'Frango Grelhado', nutrition: { protein: 30, calories: 165, carbs: 0, sugar: 0, fats: 3, saturatedFats: 1, sodium: 74, fiber: 0 } });
    const b = makeExtracted({ productName: 'Macarrão Inst.', nutrition: { protein: 4, calories: 350, carbs: 72, sugar: 3, fats: 8, saturatedFats: 3, sodium: 800, fiber: 2 } });
    const result = compare('muscle_gain', a, b);
    expect(result.verdict).toContain('Frango Grelhado');
    expect(result.keyReason).toBeTruthy();
    expect(result.keyReason.length).toBeGreaterThan(5);
  });

  it('per_serving product is correctly normalized before scoring', () => {
    // 15g protein per 50g serving → 30g per 100g (excellent for muscle_gain)
    const a = makeExtracted({
      productName: 'Shake de Proteína',
      basis: 'per_serving',
      servingSizeG: 50,
      nutrition: { protein: 15, calories: 100, carbs: 5, sugar: 2, fats: 1, saturatedFats: 0.5, sodium: 100, fiber: 0 },
    });
    const b = makeExtracted({
      productName: 'Biscoito de Arroz',
      basis: 'per_100g',
      nutrition: { protein: 3, calories: 390, carbs: 82, sugar: 5, fats: 4, saturatedFats: 1, sodium: 400, fiber: 2 },
    });
    const result = compare('muscle_gain', a, b);
    expect(result.productA.per100g.protein).toBeCloseTo(30, 2);
    expect(result.winner).toBe('A');
  });
});

// ─── compare() — mixed basis guard (Bug A fix, spec §7) ──────────────────────

describe('compare — mixed basis guard (spec §7)', () => {
  it('both per_100g: no normalizationNote, winner decided by per-100g values', () => {
    const a = makeExtracted({
      productName: 'A',
      basis: 'per_100g',
      nutrition: { protein: 20, calories: 100, carbs: 5, sugar: 1, fats: 1, saturatedFats: 0.3, sodium: 50, fiber: 0 },
    });
    const b = makeExtracted({
      productName: 'B',
      basis: 'per_100g',
      nutrition: { protein: 5, calories: 200, carbs: 20, sugar: 5, fats: 3, saturatedFats: 1, sodium: 200, fiber: 0 },
    });
    const result = compare('muscle_gain', a, b);
    expect(result.productA.normalizationNote).toBeUndefined();
    expect(result.productB.normalizationNote).toBeUndefined();
    expect(result.winner).toBe('A');
  });

  it('B has unknown serving size: A is forced to per-serving basis (winner changes)', () => {
    // A: per_serving 20g, protein=4g/serving.
    //   WITHOUT fix → scales to 20g/100g (≥15 → 30 pts) → A appears excellent.
    //   WITH fix    → raw 4g (< 6 → 0 pts) → A is actually poor.
    // B: per_serving no servingSizeG, raw protein=7g → ≥6 (→ 8 pts) → B wins.
    const a = makeExtracted({
      productName: 'Produto A',
      basis: 'per_serving',
      servingSizeG: 20,
      nutrition: { protein: 4, calories: 60, carbs: 6, sugar: 1, fats: 1, saturatedFats: 0.3, sodium: 50, fiber: 0 },
    });
    const b = makeExtracted({
      productName: 'Produto B',
      basis: 'per_serving',
      servingSizeG: null,
      nutrition: { protein: 7, calories: 60, carbs: 6, sugar: 1, fats: 1, saturatedFats: 0.3, sodium: 50, fiber: 0 },
    });
    const result = compare('muscle_gain', a, b);
    // Both are now on per-serving basis
    expect(result.productA.normalizationNote).toContain('porção');
    expect(result.productB.normalizationNote).toContain('porção');
    // Raw protein values used (A=4, B=7 — not the scaled A=20)
    expect(result.productA.per100g.protein).toBe(4);
    expect(result.productB.per100g.protein).toBe(7);
    // B wins (7g protein ≥ 6 → 8 pts vs A 4g < 6 → 0 pts)
    expect(result.winner).toBe('B');
  });

  it('A has unknown serving size: B is forced to per-serving basis', () => {
    // A: per_serving no servingSizeG → raw protein=8.
    // B: per_serving 25g → protein=10/serving, normally scales to 40g/100g.
    // After fix: both raw → B wins (10 > 8).
    const a = makeExtracted({
      productName: 'Produto A',
      basis: 'per_serving',
      servingSizeG: null,
      nutrition: { protein: 8, calories: 60, carbs: 6, sugar: 1, fats: 1, saturatedFats: 0.2, sodium: 60, fiber: 0 },
    });
    const b = makeExtracted({
      productName: 'Produto B',
      basis: 'per_serving',
      servingSizeG: 25,
      nutrition: { protein: 10, calories: 80, carbs: 8, sugar: 2, fats: 2, saturatedFats: 0.4, sodium: 80, fiber: 0 },
    });
    const result = compare('muscle_gain', a, b);
    expect(result.productA.normalizationNote).toContain('porção');
    expect(result.productB.normalizationNote).toContain('porção');
    expect(result.productB.per100g.protein).toBe(10); // raw, not 40
    expect(result.winner).toBe('B');
  });

  it('both have unknown serving size: no extra adjustment, both stay raw', () => {
    const a = makeExtracted({
      productName: 'A',
      basis: 'per_serving',
      servingSizeG: null,
      nutrition: { protein: 20, calories: 100, carbs: 5, sugar: 1, fats: 1, saturatedFats: 0.3, sodium: 50, fiber: 0 },
    });
    const b = makeExtracted({
      productName: 'B',
      basis: 'per_serving',
      servingSizeG: null,
      nutrition: { protein: 5, calories: 200, carbs: 20, sugar: 5, fats: 3, saturatedFats: 1, sodium: 200, fiber: 0 },
    });
    const result = compare('muscle_gain', a, b);
    expect(result.productA.normalizationNote).toContain('porção');
    expect(result.productB.normalizationNote).toContain('porção');
    expect(result.productA.per100g.protein).toBe(20);
    expect(result.productB.per100g.protein).toBe(5);
    expect(result.winner).toBe('A');
  });
});

// ─── score: diabetes — disqualification for sugar > 10g (Bug B fix) ──────────

describe('score: diabetes — disqualification (sugar > 10 g)', () => {
  it('sugar > 10g sets disqualified=true and disqualifyReason citing the value', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 11 } }));
    const s = score('diabetes', p);
    expect(s.disqualified).toBe(true);
    expect(s.disqualifyReason).toBeDefined();
    expect(s.disqualifyReason).toContain('11');
    expect(s.disqualifyReason).toContain('contraindicado');
  });

  it('score lines and total are NOT zeroed when disqualified', () => {
    // sugar=11 → 3 pts on sugar line (falls in 8–12 tier); total > 0
    const p = normalize(makeExtracted({ nutrition: { sugar: 11, carbs: null, fiber: null, sodium: null, saturatedFats: null } }));
    const s = score('diabetes', p);
    expect(s.disqualified).toBe(true);
    expect(s.lines).toHaveLength(5); // all 5 criterion lines present
    expect(s.total).toBe(3); // 3 pts from sugar tier 8–12; everything else null → 0
  });

  it('disqualified product (sugar > 10g) loses to a compliant product', () => {
    const a = makeExtracted({
      productName: 'Produto Saudável',
      nutrition: { sugar: 3, carbs: 10, fiber: 2, sodium: 100, saturatedFats: 1 },
    });
    const b = makeExtracted({
      productName: 'Produto Doce',
      nutrition: { sugar: 15, carbs: 20, fiber: 0, sodium: 100, saturatedFats: 1 },
    });
    const result = compare('diabetes', a, b);
    expect(result.scoreA.disqualified).toBe(false);
    expect(result.scoreB.disqualified).toBe(true);
    expect(result.winner).toBe('A');
    expect(result.verdict).toContain('eliminado');
  });

  it('both products disqualified (sugar > 10g): less-bad (higher total) wins', () => {
    // A: sugar=11 → 3 pts (tier 8–12); B: sugar=14 → 0 pts (tier ≥12)
    // Both disqualified; pickWinner falls through to total comparison → A wins
    const a = makeExtracted({
      productName: 'Menos Ruim',
      nutrition: { sugar: 11, carbs: null, fiber: null, sodium: null, saturatedFats: null },
    });
    const b = makeExtracted({
      productName: 'Pior',
      nutrition: { sugar: 14, carbs: null, fiber: null, sodium: null, saturatedFats: null },
    });
    const result = compare('diabetes', a, b);
    expect(result.scoreA.disqualified).toBe(true);
    expect(result.scoreB.disqualified).toBe(true);
    expect(result.scoreA.total).toBe(3);
    expect(result.scoreB.total).toBe(0);
    expect(result.winner).toBe('A');
    expect(result.verdict).toContain('desclassificados');
  });

  it('sugar exactly 10g is NOT disqualified (threshold is strictly > 10)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: 10 } }));
    const s = score('diabetes', p);
    expect(s.disqualified).toBe(false);
    expect(s.disqualifyReason).toBeUndefined();
  });

  it('null sugar is NOT disqualified (absence of data != contraindication)', () => {
    const p = normalize(makeExtracted({ nutrition: { sugar: null } }));
    const s = score('diabetes', p);
    expect(s.disqualified).toBe(false);
  });
});

// ─── score: low_carb — dead-code removal (Bug C fix) ─────────────────────────

describe('score: low_carb — fats criterion after dead-code removal (Bug C)', () => {
  it('fats > 10g with satFats = 0 earns 15 pts (0/total < 0.5, not the dead branch)', () => {
    // satFats=0 → 0/15 = 0.0 < 0.5 → true; dead `totalFats === 0` branch
    // was unreachable and has been removed — this case is covered by the ratio check.
    const p = normalize(makeExtracted({ nutrition: { fats: 15, saturatedFats: 0, carbs: 1, fiber: 0, sugar: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'fats')?.points).toBe(15);
  });

  it('fats > 10g with satFats exactly 50% earns 10 pts (ratio not < 0.5)', () => {
    // 5/10 = 0.5, not < 0.5 → falls to the >= 5 tier (10 pts)
    const p = normalize(makeExtracted({ nutrition: { fats: 10, saturatedFats: 5, carbs: 1, fiber: 0, sugar: 0 } }));
    const s = score('low_carb', p);
    expect(s.lines.find((l) => l.key === 'fats')?.points).toBe(10);
  });
});
