import { Header } from "@/components/layout/Header";
import { ProfileForm } from "@/components/layout/ProfileForm";
import { GarminSyncButton } from "@/components/layout/GarminSyncButton";
import { ClearActivitiesButton } from "@/components/layout/ClearActivitiesButton";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">
            Profile
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Heart rate values select the best training load model. Garmin credentials enable sync.
          </p>
          <ProfileForm
            initialName={user?.name ?? ""}
            initialHrMax={user?.hrMax ?? null}
            initialHrRest={user?.hrRest ?? null}
            initialLthrBpm={user?.lthrBpm ?? null}
            initialGarminEmail={user?.garminEmail ?? ""}
            initialGarminPassword={user?.garminPassword ?? ""}
          />

          <div className="mt-10 space-y-8 border-t border-gray-200 pt-8">
            {/* Garmin sync */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Sync Garmin</p>
              <p className="text-xs text-muted-foreground mb-4">
                Pull recent activities from Garmin Connect. Requires credentials above.
              </p>
              <GarminSyncButton />
            </div>

            {/* Danger zone */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Danger zone</p>
              <p className="text-xs text-muted-foreground mb-4">
                Permanently delete all activities and lap data. Cannot be undone.
              </p>
              <ClearActivitiesButton />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
