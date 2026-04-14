import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const deleted = db
    .delete(activities)
    .where(eq(activities.userId, userId))
    .run();

  return NextResponse.json({ deleted: deleted.changes });
}
