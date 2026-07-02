import type { ExtractedProduct, ImageFile } from '../types';

const TIMEOUT_MS = 30_000;

const NUTRIENTS = [
  'calories', 'protein', 'carbs', 'sugar',
  'fats', 'saturatedFats', 'fiber', 'sodium',
] as const;

/**
 * Calls POST /api/extract with the captured image and returns a validated
 * ExtractedProduct. Throws user-friendly Portuguese error messages on:
 *  - 30 s timeout
 *  - network / server errors
 *  - malformed response shape
 */
export async function extractProduct(image: ImageFile): Promise<ExtractedProduct> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: image.base64, mimeType: image.mimeType }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(
        data.error ?? 'Erro ao analisar a imagem. Tente novamente.',
      );
    }

    const data: unknown = await response.json();
    assertExtractedProduct(data);
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'A análise demorou demais. Verifique sua conexão e tente de novo.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Runtime shape validation ───────────────────────────────────────────────────

/** Throws a friendly error if the server response doesn't match ExtractedProduct. */
function assertExtractedProduct(data: unknown): asserts data is ExtractedProduct {
  const fail = (): never => {
    throw new Error('Resposta inesperada do servidor. Tente novamente.');
  };

  if (!data || typeof data !== 'object') fail();
  const d = data as Record<string, unknown>;

  if (typeof d.productName !== 'string') fail();
  if (typeof d.category !== 'string') fail();
  if (d.basis !== 'per_100g' && d.basis !== 'per_serving') fail();
  // servingSizeG must be exactly null or a finite number — reject strings, booleans, etc.
  if (d.servingSizeG !== null && typeof d.servingSizeG !== 'number') fail();

  if (!d.nutrition || typeof d.nutrition !== 'object') fail();
  const n = d.nutrition as Record<string, unknown>;
  for (const key of NUTRIENTS) {
    if (n[key] !== null && typeof n[key] !== 'number') fail();
  }

  if (!Array.isArray(d.ingredients)) fail();
  if (!Array.isArray(d.warnings)) fail();
  if (d.confidence !== 'high' && d.confidence !== 'medium' && d.confidence !== 'low') fail();
}
