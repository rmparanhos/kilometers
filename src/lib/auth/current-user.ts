/**
 * Returns the single local user record.
 * Project Kilometer is a self-hosted, single-user app — no authentication layer.
 */
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getCurrentUser() {
  return db.select().from(users).get() ?? null;
}
