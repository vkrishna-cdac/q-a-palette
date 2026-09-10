# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev        # vite dev server
npm run build      # production build (Nitro, cloudflare-module preset by default)
npm run preview    # serve the build
npm run lint       # eslint (prettier runs as an eslint rule — lint fails on formatting)
npm run format     # prettier --write .
npx tsc --noEmit   # typecheck (no npm script for this)
```

There is no test framework in this repo — no test runner, no test files. Don't invent one; verify changes with `npm run lint`, `npx tsc --noEmit`, and the dev server.

Docker builds override the Nitro target: `ENV NITRO_PRESET=node-server` produces `.output/server/index.mjs`, run with `node .output/server/index.mjs` on `HOST`/`PORT`.

## What this app is

A single-page procurement Q&A review console. A reviewer imports an XLSX/CSV of generated question/answer pairs, drills down **Source Document → Subject (Goods/Works/Services) → Section → Question**, edits the answer and chain-of-thought, scores each pair, and exports the reviewed workbook.

Two constraints from the product brief (README.md) drive most decisions: **only grounded source content may be shown — never invented text**, and citation/chunk provenance ("Chunk p.11–13 → Cited p.12 → Consultancy") must survive import → display → export.

## Architecture

**Everything is client-side.** There is no API, no database, no server function. Files are parsed in the browser (`xlsx` / `papaparse`), state lives in React `useState`, and both the dataset and the reviews are persisted to `localStorage` under `qa-dataset-v1` and `qa-reviews-v1` (see the key constants at the top of `src/routes/index.tsx`). `localStorage.setItem` for the dataset is wrapped in a swallowing `try/catch` because large imports exceed the quota — the app still works in-session when that write fails.

**One route, four levels.** `src/routes/index.tsx` is the whole app. The drill-down is *not* routing — `subject`, `section`, and `selected` are component state, and the breadcrumb is built from them. Adding a real URL for a level means adding files under `src/routes/` (file-based routing; see `src/routes/README.md` for the conventions — `routeTree.gen.ts` is generated, never hand-edited).

**`src/lib/qa.ts` is the data contract.** All import/normalisation/export logic lives here, and touching one half usually means touching the other:

- `pick()` resolves columns by case-insensitive header aliases (`question_text`/`question`, `cot`/`chain_of_thought`, …), so incoming spreadsheets don't need exact headers.
- `normalizeSubject` / `normalizeSection` / `normalizeLabel` fold raw labels into the fixed families. Note the deliberate renames from the brief: `Unlabelled`/`extras` → `Extra`, and loose section buckets → `Additional questions`. Only `Goods`, `Works`, `Services` get home-page cards (`SUBJECT_ORDER` in `index.tsx`); anything else is parsed but not surfaced there.
- `cleanText()` strips stray markdown asterisks/headings without adding or dropping content — this is the fix for the "duplicate answer / stray `*`" requirement. Keep it lossless.
- `exportRows()` spreads the **original raw row** and then overlays edited `answer`/`cot` plus flat `review.*` columns. This is why `QAItem.raw` exists: every unrecognised source column round-trips untouched.
- Reviewer-created questions carry `__manual: true` (id prefix `manual-`), are filtered out of the counts/tree, and export to a separate **"Added Questions"** sheet. `__manual` is stripped on export.

**`ReviewPanel.tsx`** renders one pair and owns a local `draft` that only commits to the parent on Save. Save is gated: `correct`, `grounded`, `complete`, `tone`, and `rating` must all be set. Manual items render a different, read-only layout (Category / Question / Answer / Remarks) with no evaluation controls.

**Server files exist only for SSR robustness.** `src/server.ts` wraps the Start server entry to convert h3's swallowed `{"unhandled":true,"message":"HTTPError"}` 500s into a real HTML error page; `src/start.ts` re-registers the CSRF middleware that Start would install automatically if that file didn't exist. Neither carries app logic.

`src/data/seed.json` is not imported anywhere — it's a sample of the expected input shape and the best reference for source column names.

## Conventions

**tsconfig is aggressively strict** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`. Consequences you'll hit immediately: optional props are written `foo?: string | undefined`, optional props are passed with conditional spreads (`{...(cond ? { onPrev } : {})}`) rather than `onPrev={cond ? fn : undefined}`, and indexed access returns `T | undefined`.

**Styling is Tailwind v4 CSS-first.** No `tailwind.config.js` — the design system is `@theme inline` plus `:root`/`.dark` custom properties in `src/styles.css`. All colors must be `oklch`. Custom additions beyond shadcn defaults: the `gold` color (ratings, "Edited" badges) and the `panel` `@utility` (card surface + `--shadow-panel`). Adding a semantic color means adding it to `:root`, `.dark`, *and* `@theme inline`.

shadcn/ui (new-york, lucide) components live in `src/components/ui/` and are mostly unused scaffolding — the app screens are hand-written Tailwind. `@/*` maps to `src/*`.
