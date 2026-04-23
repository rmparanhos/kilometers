import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/profile?error=strava_auth_failed`);
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Strava credentials not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error("Strava token exchange failed:", errData);
      throw new Error("Failed to exchange Strava token");
    }

    const data = await res.json();
    const { access_token, refresh_token, expires_at } = data;

    // Save tokens to user record
    db.update(users)
      .set({
        stravaAccessToken: access_token,
        stravaRefreshToken: refresh_token,
        stravaTokenExpiresAt: expires_at,
      })
      .where(eq(users.id, user.id))
      .run();

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/profile?success=strava_connected`);
  } catch (err) {
    console.error("Strava OAuth error:", err);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/profile?error=strava_auth_exception`);
  }
}
