import { Header } from "@/components/layout/Header";
import { ProfileForm } from "@/components/layout/ProfileForm";
import { GarminDownloadButton, GarminRecalcButton } from "@/components/layout/GarminRecalcButton";
import { StravaSyncButton } from "@/components/layout/StravaSyncButton";
import { ClearActivitiesButton } from "@/components/layout/ClearActivitiesButton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const stravaConnected = !!user?.stravaRefreshToken;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-1">
            Profile
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Heart rate values select the best training load model. Garmin and Strava enable sync.
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
                <p className="text-sm font-semibold text-foreground mb-1">Garmin Connect</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Fetch recent activities from Garmin Connect and save the raw .fit files locally.
                    </p>
                    <GarminDownloadButton />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Reprocess saved .fit files using your current HR profile.
                    </p>
                    <GarminRecalcButton />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Strava section */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Strava</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {stravaConnected
                    ? "Your account is connected. Import training sessions directly."
                    : "Connect to Strava to automatically sync your activities."}
                </p>
                {stravaConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                      Connected to Strava
                    </div>
                    <StravaSyncButton />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/api/auth/strava/login">Connect with Strava</Link>
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Danger zone */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-1 text-destructive">Danger zone</p>
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
