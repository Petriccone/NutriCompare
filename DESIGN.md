# NutriCompare — Design System v3 · "DUELO POP" (Neo-Brutalismo Colorido)

Radical visual redesign #2 (the editorial/monochrome direction was rejected for
being too austere). This one is **loud, colorful, chunky and fun** — a
neo-brutalist face-off. Two products enter a chunky ring and fight; the winner
gets slapped with a sticker. Confident, playful, memorable. Reference anchor:
**Gumroad** (Sahil Lavingia redesign) + Figma community neo-brutalism.

## HARD BANS (anti-AI-slop — never do these)
- ❌ NO purple/indigo/violet. NO gradient-on-white. NO gradient text. NO glassmorphism / `backdrop-blur`.
- ❌ NO soft/diffuse/blurred shadows — shadows are ALWAYS hard offset (`Npx Npx 0 #000`), zero blur.
- ❌ NO forced dark-by-default — the base is **light/cream**; dark is an opt-in toggle only.
- ❌ NO Inter, Roboto, system-ui, **or Space Grotesk** (all cliché).
- ❌ NO timid pastel-everything. Colors are FLAT, SATURATED and CONFIDENT.

## Core visual DNA (the 3 non-negotiables)
1. **Thick black borders** — `3px solid #000` on every card, button, input, block.
2. **Hard offset shadows** — `6px 6px 0 #000` (no blur). Interactive elements **sink** on press: `active:` translates by the shadow offset and the shadow collapses to `0 0`.
3. **Flat vivid color blocks** — big saturated fills, black text on light fills, white text on dark fills.

## Palette (light/cream default)
```
--bg:      #FFFBEF   /* warm cream page background */
--ink:     #000000   /* borders, text, shadows — PURE black */
--lime:    #C6F833   /* winner / positive / energy (black text on it) */
--pink:    #FF7DE3   /* highlight / playful accent (black text) */
--blue:    #2B4BF2   /* secondary / info (white text) */
--yellow:  #FFD23F   /* accents / badges (black text) */
--red:     #FF5A47   /* loser / bad nutrient / contraindication (white or black text — check contrast) */
--paper2:  #FFFFFF   /* card fills that need to sit on cream */
```
Dark (toggle only): `--bg:#141414`, `--ink:#FFFFFF` (borders/shadows become white `6px 6px 0 #FFF`), the vivid accents stay and pop harder. **Default MUST be light** (set the app's initial theme to light; no dark flash on first paint).

Discipline: 2–3 accents per screen max, used as big BLOCKS not sprinkles. Winner = lime block; loser = muted/red. Don't rainbow everything.

## Typography (load via Google Fonts `<link>` in index.html)
- **Display / headlines / GIANT numbers:** a chunky characterful grotesk — pick ONE of `Bricolage Grotesque` (800), `Syne` (800), or `Archivo Black`. NOT Inter/Space Grotesk. Numbers are HEROES (score at 56–88px, black weight).
- **Data / labels / buttons:** `Space Mono` (700) — uppercase, tracked, for the "machine" feel on values, tags, and button labels.
- **Body:** the same display grotesk at regular weight, or `Hanken Grotesk`.
- Hierarchy by SIZE + WEIGHT + COLOR BLOCK, loud and clear.

## Signature moments (make these unforgettable)
1. **Winner sticker**: a rotated die-cut sticker `MELHOR ESCOLHA` (lime, black border, black text) that **slaps** onto the winning card — scale 1.3→1 + rotate ≈ -8°, snappy overshoot. Loser gets a small red `EVITAR` / `CONTRAINDICADO` tag.
2. **The VS duel**: two chunky bordered product cards side-by-side (stacked on mobile) with a big circular `VS` badge (yellow, black border, hard shadow) overlapping between them.
3. **Sink-on-press**: every button/card visibly sinks into its shadow when tapped. Extremely tactile.
4. **Pop-in reveal**: cards pop in with a quick scale overshoot + stagger. Score numbers count up. Snappy easing only — NO elastic/bouncy slow easing.

## Per-screen intent
- **Onboarding**: goal picker = a grid/stack of chunky bordered "sticker buttons", each a different accent block, with a big playful title. Selecting one sinks it + checks it.
- **Header**: chunky masthead — the wordmark in a bordered black block, chunky icon buttons (history, theme) each bordered with hard shadow.
- **CameraCapture**: keep ALL camera logic untouched; restyle only overlay/frame/buttons: a thick bordered viewfinder, a BIG round capture button (bordered, hard shadow, sinks on press).
- **NutritionReview**: editable values in chunky bordered inputs; serving/basis as a chunky toggle; confidence + warnings as bordered sticker tags.
- **ScoreBreakdown**: each criterion a bordered row with a chunky **segmented/blocky bar** (lime = good, red = bad per goal direction); points shown big.
- **ComparisonResult**: the VS duel + winner sticker hero + the breakdown + a chunky "salvar/salvo" button. Handle `winner:'tie'` (yellow `EMPATE` badge).
- **History**: a stack of chunky bordered receipt-cards (date · goal · winner accent), open/delete/clear as chunky buttons.

## Guardrails for the build
- Presentation ONLY. Do NOT change types, props, services, scoring, API, or App.tsx state/handlers/effects/flow. The **132 tests** MUST still pass and `npm run build` / `tsc --noEmit` MUST stay green.
- Default theme = LIGHT (cream). No flash of dark on first paint.
- Accessibility: `aria-label` on icon buttons; verify text contrast passes WCAG AA on every color block (e.g. black text on lime/pink/yellow; white text on blue/red — check each).
