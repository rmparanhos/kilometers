import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { ProfileForm } from "@/components/layout/ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = db.select({
    name: users.name,
    hrMax: users.hrMax,
    hrRest: users.hrRest,
    lthrBpm: users.lthrBpm,
  }).from(users).where(eq(users.id, userId)).get();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">
            Profile
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Heart rate values are used to select the best training load model for your activities.
          </p>
          <ProfileForm
            initialName={user?.name ?? ""}
            initialHrMax={user?.hrMax ?? null}
            initialHrRest={user?.hrRest ?? null}
            initialLthrBpm={user?.lthrBpm ?? null}
          />
        </div>
      </main>
    </>
  );
}
