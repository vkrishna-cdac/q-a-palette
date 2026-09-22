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
npm run db:generate # after editing src/server/schema.ts, writes a SQL migration into drizzle/
```

Requires `JWT_SECRET` (and optionally `DATABASE_PATH`, default `./data/app.db`) in the environment — see `.env.example`. `vite dev` loads a local `.env` automatically; Docker/production must pass these as real env vars.

There is no test framework in this repo — no test runner, no test files. Don't invent one; verify changes with `npm run lint`, `npx tsc --noEmit`, and the dev server.

Docker builds override the Nitro target: `ENV NITRO_PRESET=node-server` produces `.output/server/index.mjs`, run with `node .output/server/index.mjs` on `HOST`/`PORT`.

## What this app is

A single-page procurement Q&A review console. A reviewer imports an XLSX/CSV of generated question/answer pairs, drills down **Source Document → Subject (Goods/Works/Services) → Section → Question**, edits the answer and chain-of-thought, scores each pair, and exports the reviewed workbook.

Two constraints from the product brief (README.md) drive most decisions: **only grounded source content may be shown — never invented text**, and citation/chunk provenance ("Chunk p.11–13 → Cited p.12 → Consultancy") must survive import → display → export.

## Architecture

**Auth and the dataset are server-backed; only reviews are still client-side.** Reviews (ratings/comments/edited answer+cot) live in React state and persist to `localStorage` under `qa-reviews-v1` (`ReviewsProvider` in `src/routes/_app.tsx`) — that's the one piece still staged for a future SQLite move (versioning/audit). The Q&A dataset itself is **not** imported through the UI: `src/server/seed.ts` loads `public/1000QA.csv` once, on first boot, into the `qa_items` SQLite table (via `db.ts` calling `seedQaItemsIfEmpty` after migrations); there is no upload/import feature and none is planned — reviewer-added questions go through `addManualItem` instead, straight into the same table (`manual: true`, `section: "Added Questions"`).

**Auth is server-backed (`src/server/`).** `src/server/schema.ts` defines the Drizzle/SQLite tables — `users`, `refresh_tokens`, `qa_items` — via `better-sqlite3` (`src/server/db.ts`, path from `DATABASE_PATH`, migrations in `drizzle/` applied automatically on boot; `npm run db:generate` regenerates them from the schema). `src/server/auth.ts` holds the crypto primitives (scrypt password hashing, JWT sign/verify via `jose`, refresh-token hashing). `src/server/functions/auth.ts` exposes `register`/`login`/`logout`/`me` as TanStack Start server functions (`createServerFn`), using an access-JWT (15 min) + rotating opaque refresh token (30 days) pattern: each refresh rotates the token and revokes the old one via `replacedBy`; a refresh token presented after it's already been rotated is treated as theft and revokes every active token for that user. Both tokens live in `httpOnly`/`Secure`/`SameSite=Lax` cookies (`qa_access`/`qa_refresh`), never in `localStorage` or a JS-readable form. `src/server/functions/qa.ts` exposes `listItems`/`addManualItem`, both gated behind `authMiddleware`. There are no roles — any authenticated user has full access. Docker's `node-server` build is the only supported deploy target for this (Cloudflare Workers can't open a local SQLite file); the Dockerfile copies `drizzle/` and declares a `/app/data` volume for the database file.

**Real routes, one layout.** The drill-down (Source Document → Subject → Section → Question) is actual file-based routing, not component state: `src/routes/_app.tsx` is a pathless layout (auth guard via `beforeLoad`, loads `qa_items` once via a route `loader` + TanStack Query, renders the header/export buttons/logout and provides reviews via `useReviews()`), and `src/routes/_app/index.tsx` (`/`), `$subject/index.tsx` (`/:subject`), `$subject/add.tsx` (`/:subject/add`), `$subject/$section/index.tsx` (`/:subject/:section`), `$subject/$section/$questionId.tsx` (`/:subject/:section/:questionId`) are the four levels plus the add-question page. Each leaf route reads `itemsQueryOptions` from `_app.tsx` via `useSuspenseQuery` rather than refetching. See `src/routes/README.md` for the file-based routing conventions — `routeTree.gen.ts` is generated, never hand-edited.

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

**Styling is Tailwind v4 CSS-first.** No `tailwind.config.js` — the design system is `@theme inline` plus `:root`/`.dark` custom properties in `src/styles.css`. All colors must be `oklch`. Custom additions beyond shadcn defaults: the `gold` color (ratings, "Edited" badges) and the `panel` `@utility` (card surface + `--shadow-panel`). Adding a semantic color means adding it to `:root`, `.dark`, _and_ `@theme inline`.

shadcn/ui (new-york, lucide) components live in `src/components/ui/` and are mostly unused scaffolding — the app screens are hand-written Tailwind. `@/*` maps to `src/*`.
