import { asc } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db";
import { qaItems } from "../schema";
import { newId } from "../auth";
import { authMiddleware } from "./auth";
import type { QAItem } from "@/lib/qa";

function rowToItem(row: typeof qaItems.$inferSelect): QAItem {
  return {
    id: row.id,
    sourceDoc: row.sourceDoc,
    subject: row.subject,
    section: row.section,
    chunkName: row.chunkName,
    chunkPageRange: row.chunkPageRange,
    citedManual: row.citedManual,
    citedPage: row.citedPage,
    question: row.question,
    answer: row.answer,
    cot: row.cot,
    chunkContent: row.chunkContent,
    manual: row.manual,
    raw: row.raw,
  };
}

export const listItems = createServerFn({ method: "GET", strict: { output: false } })
  .middleware([authMiddleware])
  .handler(async () => {
    const rows = await db.select().from(qaItems).orderBy(asc(qaItems.createdAt));
    return rows.map(rowToItem);
  });

const addManualItemSchema = z.object({
  subject: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  remarks: z.string(),
});

export const addManualItem = createServerFn({ method: "POST", strict: { output: false } })
  .middleware([authMiddleware])
  .validator(addManualItemSchema)
  .handler(async ({ data }) => {
    const item: QAItem = {
      id: `manual-${newId()}`,
      sourceDoc: "Manual entry",
      subject: data.subject,
      section: "Added Questions",
      chunkName: "",
      chunkPageRange: "",
      citedManual: "",
      citedPage: "",
      question: data.question,
      answer: data.answer,
      cot: "",
      chunkContent: "",
      manual: true,
      raw: { remarks: data.remarks },
    };
    await db.insert(qaItems).values({ ...item, createdAt: Date.now() });
    return item;
  });
