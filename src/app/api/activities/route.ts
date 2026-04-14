import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { activities, activityLaps } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Fetch activity IDs first, then delete laps explicitly before activities.
  // This avoids relying on SQLite cascade (which requires foreign_keys = ON
  // to be active on the connection AND the constraint to exist in the schema).
  const userActivityIds = db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.userId, userId))
    .all()
    .map((r) => r.id);

  if (userActivityIds.length > 0) {
    db.delete(activityLaps)
      .where(inArray(activityLaps.activityId, userActivityIds))
      .run();
  }

  const deleted = db
    .delete(activities)
    .where(eq(activities.userId, userId))
    .run();

  return NextResponse.json({ deleted: deleted.changes });
}
