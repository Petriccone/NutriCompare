import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComparisonResult, NormalizedProduct, GoalScore } from '../types';

// ─── localStorage mock ───────────────────────────────────────────────────────
// history.ts uses the `localStorage` global. In the vitest node environment
// it doesn't exist; we stub it with a simple in-memory Map before each test.

function makeMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => { store.set(key, value); },
    removeItem: (key: string): void => { store.delete(key); },
    clear: (): void => { store.clear(); },
  };
}

// We import the history functions AFTER stubbing so that the global is in place
// when the module first runs. Because modules are cached after first import in
// Vitest, we stub before the first `it` executes (in `beforeEach`) which is
// fine since the functions call `localStorage` lazily (not at module load time).
import { saveComparison, listHistory, deleteEntry, clearHistory } from './history';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeNormalizedProduct(name: string): NormalizedProduct {
  return {
    productName: name,
    category: 'Alimento',
    per100g: {
      calories: 100, protein: 10, carbs: 20, sugar: 5,
      fats: 3, saturatedFats: 1, fiber: 2, sodium: 200,
    },
    netCarbs: 18,
    ingredients: ['ingrediente1'],
    isAnimalFree: true,
  };
}

function makeScore(total: number): GoalScore {
  return { total, lines: [], disqualified: false };
}

function makeResult(
  productAName = 'Produto A',
  productBName = 'Produto B',
  winner: ComparisonResult['winner'] = 'A',
): ComparisonResult {
  return {
    goal: 'general',
    productA: makeNormalizedProduct(productAName),
    productB: makeNormalizedProduct(productBName),
    scoreA: makeScore(80),
    scoreB: makeScore(40),
    winner,
    verdict: `${productAName} é melhor`,
    keyReason: 'menos sódio',
    createdAt: Date.now(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('history: saveComparison / listHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMockLocalStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveComparison returns a HistoryEntry with non-empty id', () => {
    const entry = saveComparison(makeResult());
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it('saveComparison mirrors the result fields onto the entry', () => {
    const result = makeResult('Aveia', 'Granola', 'A');
    const entry = saveComparison(result);
    expect(entry.goal).toBe('general');
    expect(entry.productAName).toBe('Aveia');
    expect(entry.productBName).toBe('Granola');
    expect(entry.winner).toBe('A');
    expect(entry.createdAt).toBe(result.createdAt);
    expect(entry.result).toBe(result);  // same reference
  });

  it('listHistory returns [] when nothing has been saved', () => {
    expect(listHistory()).toEqual([]);
  });

  it('saved entry appears in listHistory', () => {
    const result = makeResult('A', 'B');
    saveComparison(result);
    const list = listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].productAName).toBe('A');
  });

  it('listHistory returns newest-first (last saved is index 0)', () => {
    saveComparison(makeResult('primeiro', 'X'));
    saveComparison(makeResult('segundo', 'Y'));
    saveComparison(makeResult('terceiro', 'Z'));
    const list = listHistory();
    expect(list[0].productAName).toBe('terceiro');
    expect(list[1].productAName).toBe('segundo');
    expect(list[2].productAName).toBe('primeiro');
  });

  it('two saves produce two distinct ids', () => {
    const id1 = saveComparison(makeResult()).id;
    const id2 = saveComparison(makeResult()).id;
    expect(id1).not.toBe(id2);
  });
});

describe('history: deleteEntry', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMockLocalStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deleteEntry removes only the targeted entry', () => {
    const e1 = saveComparison(makeResult('A', 'B'));
    const e2 = saveComparison(makeResult('C', 'D'));
    deleteEntry(e1.id);
    const list = listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(e2.id);
  });

  it('deleteEntry with non-existent id is a no-op', () => {
    saveComparison(makeResult());
    deleteEntry('id-que-nao-existe');
    expect(listHistory()).toHaveLength(1);
  });

  it('deleteEntry on empty history does not throw', () => {
    expect(() => deleteEntry('any-id')).not.toThrow();
  });
});

describe('history: clearHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMockLocalStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clearHistory removes all entries', () => {
    saveComparison(makeResult('A', 'B'));
    saveComparison(makeResult('C', 'D'));
    clearHistory();
    expect(listHistory()).toEqual([]);
  });

  it('clearHistory on empty history does not throw', () => {
    expect(() => clearHistory()).not.toThrow();
  });

  it('can save new entries after clearing', () => {
    saveComparison(makeResult('antigo', 'X'));
    clearHistory();
    saveComparison(makeResult('novo', 'Y'));
    const list = listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].productAName).toBe('novo');
  });
});

describe('history: resilience against corrupted localStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMockLocalStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns [] when localStorage contains invalid JSON', () => {
    // Directly corrupt the storage key
    localStorage.setItem('nutricompare.history.v1', 'NOT VALID JSON {{{');
    expect(listHistory()).toEqual([]);
  });

  it('returns [] when localStorage contains a non-array JSON value (object)', () => {
    localStorage.setItem('nutricompare.history.v1', JSON.stringify({ key: 'not-an-array' }));
    expect(listHistory()).toEqual([]);
  });

  it('returns [] when localStorage contains a non-array JSON value (string)', () => {
    localStorage.setItem('nutricompare.history.v1', JSON.stringify('just a string'));
    expect(listHistory()).toEqual([]);
  });

  it('saveComparison does not throw when called after corruption', () => {
    localStorage.setItem('nutricompare.history.v1', 'CORRUPTED');
    expect(() => saveComparison(makeResult())).not.toThrow();
  });

  it('after saving over corrupted data, listHistory returns exactly 1 entry', () => {
    localStorage.setItem('nutricompare.history.v1', 'CORRUPTED');
    saveComparison(makeResult('fresh', 'data'));
    const list = listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].productAName).toBe('fresh');
  });

  it('filters out malformed entries and returns only valid ones', () => {
    // Save one valid entry through the normal API so it is in storage.
    const valid = saveComparison(makeResult('valido', 'X'));

    // Manually append malformed entries directly into localStorage.
    const stored = JSON.parse(
      localStorage.getItem('nutricompare.history.v1') as string,
    ) as unknown[];
    const malformed = [
      { id: 999, createdAt: 'string', winner: 'neither' },  // wrong types
      { winner: 'A', result: {} },                           // missing id / createdAt
      null,                                                  // null element
      'just a string',                                       // primitive
    ];
    localStorage.setItem(
      'nutricompare.history.v1',
      JSON.stringify([...stored, ...malformed]),
    );

    const list = listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(valid.id);
  });
});
