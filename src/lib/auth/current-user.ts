import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const activeUserId = cookieStore.get("activeUserId")?.value;

  if (activeUserId) {
    const user = db.select().from(users).where(eq(users.id, activeUserId)).get();
    if (user) return user;
  }

  return db.select().from(users).get() ?? null;
}
