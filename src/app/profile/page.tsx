import { Header } from "@/components/layout/Header";
import { ProfileClient } from "@/components/layout/ProfileClient";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const stravaConnected = !!user?.stravaRefreshToken;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Profile Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your personal information, physiological profile, and activity integrations.
          </p>

          <ProfileClient
            initialName={user?.name ?? ""}
            initialHrMax={user?.hrMax ?? null}
            initialHrRest={user?.hrRest ?? null}
            initialLthrBpm={user?.lthrBpm ?? null}
            initialGarminEmail={user?.garminEmail ?? ""}
            initialGarminPassword={user?.garminPassword ?? ""}
            stravaConnected={stravaConnected}
          />
        </div>
      </main>
    </>
  );
}
