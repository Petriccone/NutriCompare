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
