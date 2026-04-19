import { Header } from "@/components/layout/Header";
import { ProfileForm } from "@/components/layout/ProfileForm";
import { GarminDownloadButton, GarminRecalcButton } from "@/components/layout/GarminRecalcButton";
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
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Download from Garmin</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Fetch recent activities from Garmin Connect and save the raw .fit files locally.
                </p>
                <GarminDownloadButton />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Recalculate</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Reprocess saved .fit files using your current HR profile. Use after updating HR max / HR rest.
                </p>
                <GarminRecalcButton />
              </div>
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
