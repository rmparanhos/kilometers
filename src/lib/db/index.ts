import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_URL ?? "./db/local.db");

// WAL mode prevents "database is locked" errors in Next.js dev
// (multiple processes hit the DB simultaneously during HMR)
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
