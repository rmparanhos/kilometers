import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  const all = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      hrMax: users.hrMax,
      hrRest: users.hrRest,
      lthrBpm: users.lthrBpm,
      garminEmail: users.garminEmail,
      createdAt: users.createdAt,
    })
    .from(users)
    .all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const password = typeof body.password === "string" ? body.password : null;
  const name = typeof body.name === "string" ? body.name.trim() || null : null;

  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const hrMax = typeof body.hrMax === "number" ? Math.round(body.hrMax) : null;
  const hrRest = typeof body.hrRest === "number" ? Math.round(body.hrRest) : null;
  const lthrBpm = typeof body.lthrBpm === "number" ? Math.round(body.lthrBpm) : null;

  const inserted = db
    .insert(users)
    .values({ name, email, hashedPassword, hrMax, hrRest, lthrBpm })
    .returning({ id: users.id })
    .get();

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
}
