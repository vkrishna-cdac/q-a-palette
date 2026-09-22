import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { toItems, type Row } from "@/lib/qa";
import { qaItems } from "./schema";
import type * as schema from "./schema";

// The dataset ships as a static CSV served from public/ (see src/routes/index.tsx
// history); there is no import UI — qa_items is just seeded from it once.
const CSV_CANDIDATES = [
  "public/1000QA.csv",
  "public/storage/1000QA.csv",
  ".output/public/1000QA.csv",
];

export function seedQaItemsIfEmpty(db: BetterSQLite3Database<typeof schema>): void {
  const existing = db.select({ id: qaItems.id }).from(qaItems).limit(1).get();
  if (existing) return;

  const csvPath = CSV_CANDIDATES.map((p) => resolve(p)).find((p) => existsSync(p));
  if (!csvPath) {
    console.warn(
      "[seed] No source CSV found (checked public/1000QA.csv, public/storage/1000QA.csv); qa_items left empty.",
    );
    return;
  }

  const text = readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  const items = toItems(parsed.data as Row[]);
  const now = Date.now();

  db.insert(qaItems)
    .values(
      items.map((it) => ({
        id: it.id,
        sourceDoc: it.sourceDoc,
        subject: it.subject,
        section: it.section,
        chunkName: it.chunkName,
        chunkPageRange: it.chunkPageRange,
        citedManual: it.citedManual,
        citedPage: it.citedPage,
        question: it.question,
        answer: it.answer,
        cot: it.cot,
        chunkContent: it.chunkContent,
        manual: it.manual,
        raw: it.raw,
        createdAt: now,
      })),
    )
    .run();

  console.log(`[seed] Loaded ${items.length} qa_items from ${csvPath}`);
}
