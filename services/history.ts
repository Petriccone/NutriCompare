import { ComparisonResult, HistoryEntry } from '../types';

const STORAGE_KEY = 'nutricompare.history.v1';

/** Light structural check — rejects entries with obviously wrong shape.
 *  Does not deep-validate ComparisonResult internals; just enough to prevent
 *  a malformed localStorage entry from crashing History.tsx. */
function isValidEntry(entry: unknown): entry is HistoryEntry {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== 'string') return false;
  if (typeof e.createdAt !== 'number') return false;
  if (e.winner !== 'A' && e.winner !== 'B' && e.winner !== 'tie') return false;
  if (!e.result || typeof e.result !== 'object') return false;
  return true;
}

function readStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter silently — malformed entries are dropped, not thrown.
    return parsed.filter(isValidEntry);
  } catch {
    // Corrupted data — reset silently
    return [];
  }
}

function writeStorage(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or not available — silently ignore
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Persist a ComparisonResult to localStorage history.
 * Returns the created HistoryEntry (with its generated id).
 */
export function saveComparison(result: ComparisonResult): HistoryEntry {
  const entry: HistoryEntry = {
    id: generateId(),
    createdAt: result.createdAt,
    goal: result.goal,
    productAName: result.productA.productName,
    productBName: result.productB.productName,
    winner: result.winner,
    result,
  };
  const current = readStorage();
  // Prepend so listHistory() returns newest first without extra sort
  writeStorage([entry, ...current]);
  return entry;
}

/**
 * Returns all history entries, newest first.
 */
export function listHistory(): HistoryEntry[] {
  return readStorage();
}

/**
 * Delete a single entry by id. No-op if id not found.
 */
export function deleteEntry(id: string): void {
  const current = readStorage();
  writeStorage(current.filter((e) => e.id !== id));
}

/**
 * Clear the entire history.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}
