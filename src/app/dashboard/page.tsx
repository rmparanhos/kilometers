import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { fillGaps, computeFormSeries, getFormZone, bestVO2maxEstimate } from "@/lib/training/metrics";
import { FormChart } from "@/components/charts/FormChart";
import { HeatmapCalendar } from "@/components/charts/HeatmapCalendar";
import { Header } from "@/components/layout/Header";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { FormPoint } from "@/lib/training/metrics";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500 text-sm">
            No user found. Run <code className="font-mono">npm run db:seed</code> to create one.
          </p>
        </main>
      </>
    );
  }

  // Fetch all activities for this user ordered by date
  const userActivities = db
    .select({
      startedAt: activities.startedAt,
      trainingLoad: activities.trainingLoad,
      distanceM: activities.distanceM,
      durationSec: activities.durationSec,
      avgPaceMperS: activities.avgPaceMperS,
      avgHeartRateBpm: activities.avgHeartRateBpm,
    })
    .from(activities)
    .where(eq(activities.userId, user.id))
    .orderBy(asc(activities.startedAt))
    .all();

  // Build form series
  const dailyLoads = fillGaps(userActivities);
  const series: FormPoint[] = computeFormSeries(dailyLoads);

  const lastPoint = series[series.length - 1];
  const currentCTL = lastPoint?.ctl ?? 0;
  const currentATL = lastPoint?.atl ?? 0;
  const currentTSB = lastPoint?.tsb ?? 0;
  const currentZone = getFormZone(currentTSB);

  const hasData = series.length > 0;

  const vo2max = bestVO2maxEstimate(userActivities, {
    hrMax: user.hrMax,
    hrRest: user.hrRest,
    lthrBpm: user.lthrBpm,
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {hasData
                  ? `${userActivities.length} activit${userActivities.length !== 1 ? "ies" : "y"} recorded`
                  : "No activities yet"}
              </p>
            </div>
          </div>

          {hasData ? (
            <>
              <FormChart
                series={series}
                currentZone={currentZone}
                currentCTL={currentCTL}
                currentATL={currentATL}
                currentTSB={currentTSB}
                vo2max={vo2max}
              />
              <HeatmapCalendar activities={userActivities} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
      <p className="text-4xl">🏃</p>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        No activities yet
      </h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
        Upload a <code className="font-mono">.fit</code> or{" "}
        <code className="font-mono">.gpx</code> file to start tracking your
        fitness, fatigue, and form.
      </p>
      <a
        href="/activities"
        className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        Go to Activities
      </a>
    </div>
  );
}
