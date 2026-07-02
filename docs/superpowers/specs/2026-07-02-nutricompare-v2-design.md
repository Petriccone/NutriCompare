# NutriCompare v2 — Design & Spec

**Date:** 2026-07-02
**Status:** Approved by user ("segue, me entregue pronto")

## 1. Goal

Rebuild NutriCompare so the nutritional comparison is **genuinely reliable and
explainable** (not a black box), with a full UX redesign and secure production
deploy on Vercel.

## 2. Approved decisions

1. **Deterministic scoring engine.** The AI (Gemini 2.5 Flash) only performs
   OCR/extraction of numbers + ingredients. All scoring math lives in typed,
   tested TypeScript (`services/scoring/`). No LLM verdict math.
2. **Editable OCR review.** After each scan the user sees the extracted values
   and can correct them before comparison.
3. **Serverless proxy for the API key.** The Gemini key moves server-side to a
   Vercel function (`/api/extract`). The browser never sees the key.
4. **Value-add:** local history (localStorage, no login) + educational score
   breakdown (why a product won, per nutrient).

Kept as-is: Gemini 2.5 Flash, React 19 + TS + Vite, Tailwind via CDN, evolve
in place (do not throw away the solid foundation).

## 3. New user flow

```
ONBOARDING (goal) → SCAN_A → [extract A] → REVIEW_A (edit numbers)
                  → SCAN_B → [extract B] → REVIEW_B (edit numbers)
                  → RESULT (instant, deterministic) → HISTORY
```

The comparison itself is **synchronous code** — only extraction touches the
network. Extraction loading is a boolean during SCAN→REVIEW transitions.

## 4. Architecture

```
Camera/Upload ──base64──▶ POST /api/extract (serverless, holds GEMINI_API_KEY)
                                │  Gemini structured JSON extraction
                                ▼
                         ExtractedProduct  ──▶ REVIEW screen (user edits)
                                │
                         normalize() → NormalizedProduct (per 100 g)
                                │
                         score(goal, product) → GoalScore  (deterministic)
                                │
                         compare() → ComparisonResult → Result UI + history
```

## 5. Data contract

Source of truth: `types.ts` (already written). Key types: `NutritionFacts`,
`ExtractedProduct`, `NormalizedProduct`, `ScoreLine`, `GoalScore`,
`ComparisonResult`, `HistoryEntry`, `AppStep`, `UserGoal`. All numeric fields
are `number | null`. `null` = absent/unreadable (distinct from 0).

## 6. Component / file ownership (parallel-safe — no two agents touch the same file)

| Owner | Files | Responsibility |
|---|---|---|
| **dev-motor** | `services/scoring/normalize.ts`, `services/scoring/goals/*.ts`, `services/scoring/compare.ts`, `services/scoring/verdict.ts`, `services/scoring/index.ts`, `services/scoring/*.test.ts`, `services/history.ts` | Pure TS scoring engine (TDD) + localStorage history. Port the six 100-pt frameworks verbatim from the existing `services/geminiService.ts` into code. |
| **dev-backend** | `api/extract.ts`, `services/extractionService.ts`, `vercel.json`, `.env.example`, `vite.config.ts` (add dev middleware only) | Serverless extraction proxy (server-side key), typed client with timeout + schema validation, local `vite dev` middleware so `/api/extract` also works in dev. |
| **dev-ux** | `components/Onboarding.tsx`, `components/Header.tsx`, `components/NutritionReview.tsx` (new), `components/ComparisonResult.tsx`, `components/History.tsx` (new), `components/ScoreBreakdown.tsx` (new), `styles.css` (new), `index.html` (theme/fonts only), `components/ui/*` (shared) | Full visual redesign + editable review + result/breakdown + history UI. Use frontend-design skill. |
| **integration (wave B)** | `App.tsx`, `components/CameraCapture.tsx` | Wire the flow, fix the 5 camera/state bugs, remove debug logs. Runs AFTER wave A. |
| **removed** | `services/geminiService.ts` (replaced), `components/ImageInput.tsx` (folded/fixed) | — |

## 7. Scoring engine spec (dev-motor)

- **normalize(extracted): NormalizedProduct** — convert all values to per 100 g.
  - `per_100g` basis → use directly.
  - `per_serving` + `servingSizeG` known → `v * 100 / servingSizeG`.
  - `per_serving` + serving unknown → keep raw, set `normalizationNote`, engine
    compares both on the same (per-serving) basis and both products must use it.
  - `netCarbs = max(0, carbs - fiber)`.
  - `isAnimalFree` derived from ingredients vs. the animal-ingredient list
    (ported from the vegan profile in geminiService.ts).
- **score(goal, product): GoalScore** — one function per goal, porting the exact
  point bands and critical/disqualifier rules from `geminiService.ts`
  `EXPERT_PROFILES`. Output every criterion as a `ScoreLine` (auditable).
  Missing nutrient (`null`) → 0 pts for that line + a `note`.
- **compare(goal, a, b): ComparisonResult** — normalize both, score both, pick
  winner by total (respect disqualification: disqualified always loses; both
  disqualified → the less-bad or `tie`). `verdict`/`keyReason` are templated
  from real numbers (e.g. "Vence a Opção A: 8 g de açúcar vs. 18 g").
- **history.ts** — `saveComparison`, `listHistory`, `clearHistory`,
  `deleteEntry` over `localStorage` with a versioned key + safe JSON parsing.
- **Tests:** vitest. Cover each goal (winner, disqualifier, tie, null nutrient,
  per-serving normalization). This is the reliability guarantee.

## 8. Extraction proxy spec (dev-backend)

- `api/extract.ts` — Vercel Node serverless function. Reads
  `process.env.GEMINI_API_KEY` (NOT `VITE_`). Accepts `{ imageBase64, mimeType }`,
  calls Gemini 2.5 Flash with a `responseSchema` matching `ExtractedProduct`,
  returns it. Never echoes the key; generic error messages. Basic input guards
  (payload size cap ~6 MB, base64 sanity). Method/size/rate guards.
- `services/extractionService.ts` — client `extractProduct(image): Promise<ExtractedProduct>`
  calling `/api/extract` with an **AbortController timeout (~30 s)** and runtime
  validation of the returned shape (throw a friendly error if malformed).
- Prompt: keep the OCR discipline from the old prompt (fix `g`↔`9`, `O`↔`0`,
  commas), extract ingredients, report `confidence` + `warnings`. **No scoring
  in the prompt.**
- Local dev: a small Vite plugin/middleware serves `/api/extract` under
  `npm run dev` (so testing doesn't require `vercel dev`).
- `.env.example` documents `GEMINI_API_KEY=`. README updated by integration.

## 9. UX redesign spec (dev-ux)

- Cohesive visual system (color, type scale, spacing, motion), dark/light,
  mobile-first. Elevate beyond generic AI look — this is the "UX designer"
  pass the user asked for.
- **Onboarding:** goal picker with clear iconography + one-line "what we
  optimize" per goal.
- **NutritionReview (new):** editable numeric fields for each nutrient, serving
  size + basis toggle, confidence badge, warnings; "confirmar e continuar".
- **ComparisonResult (redesign):** winner hero, `ScoreBreakdown` per nutrient
  (points earned vs max, good/bad direction relative to goal), disqualifier
  alerts, verdict, save-to-history affordance.
- **ScoreBreakdown (new):** renders `GoalScore.lines` for both products.
- **History (new):** list past comparisons, open one, delete/clear.
- Components consume ONLY the `types.ts` contract (no hardcoded goal math).

## 10. Bug fixes (integration wave)

Critical: API timeout (in extractionService), schema validation, camera
`setTimeout` cleanup, refs race in `App.tsx` (derive from state/step, not manual
ref sync), `URL.createObjectURL` revoke. Plus: remove ~14 debug `console.log`,
image max-size cap on capture, base64 validation, replace blocking `alert()`.

## 11. Verification & deploy

- `reviewer` (whole diff), `security` (key handling, proxy, injection surface of
  extracted text), `tester` (scoring suite + `npm run build`).
- Run locally, confirm end-to-end.
- **GO-GATE 2:** show the user, get explicit "ok", then deploy to Vercel.
  User must set `GEMINI_API_KEY` in Vercel project env.

## 12. Out of scope (this round)

Accounts/cloud sync, 3+ product comparison, barcode/off-line database,
multi-language beyond current PT.
