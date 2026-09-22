import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { seedQaItemsIfEmpty } from "./seed";

const databasePath = resolve(process.env["DATABASE_PATH"] ?? "./data/app.db");
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: resolve("./drizzle") });
seedQaItemsIfEmpty(db);
