import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = db.select({
    name: users.name,
    hrMax: users.hrMax,
    hrRest: users.hrRest,
    lthrBpm: users.lthrBpm,
  }).from(users).where(eq(users.id, userId)).get();

  return NextResponse.json(user ?? {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));

  const hrMax   = typeof body.hrMax   === "number" ? Math.round(body.hrMax)   : null;
  const hrRest  = typeof body.hrRest  === "number" ? Math.round(body.hrRest)  : null;
  const lthrBpm = typeof body.lthrBpm === "number" ? Math.round(body.lthrBpm) : null;
  const name    = typeof body.name    === "string"  ? body.name.trim() || null : undefined;

  db.update(users)
    .set({
      ...(name !== undefined && { name }),
      hrMax,
      hrRest,
      lthrBpm,
    })
    .where(eq(users.id, userId))
    .run();

  return NextResponse.json({ ok: true });
}
