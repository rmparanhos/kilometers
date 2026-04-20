import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : null;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("activeUserId", userId, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
