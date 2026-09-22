import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Row } from "@/lib/qa";

// created_at/expires_at/revoked_at store epoch milliseconds as plain integers
// (Date.now()) rather than drizzle's `timestamp_ms` mode, which expects Date
// objects on every read/write/compare.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
  replacedBy: text("replaced_by"),
});

// Mirrors QAItem (src/lib/qa.ts) field-for-field. `raw` keeps the original
// source row as JSON so export can round-trip unrecognised columns losslessly.
export const qaItems = sqliteTable("qa_items", {
  id: text("id").primaryKey(),
  sourceDoc: text("source_doc").notNull(),
  subject: text("subject").notNull(),
  section: text("section").notNull(),
  chunkName: text("chunk_name").notNull(),
  chunkPageRange: text("chunk_page_range").notNull(),
  citedManual: text("cited_manual").notNull(),
  citedPage: text("cited_page").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  cot: text("cot").notNull(),
  chunkContent: text("chunk_content").notNull(),
  manual: integer("manual", { mode: "boolean" }).notNull(),
  raw: text("raw", { mode: "json" }).$type<Row>().notNull(),
  createdAt: integer("created_at").notNull(),
});
