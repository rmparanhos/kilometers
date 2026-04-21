import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  fillGaps,
  computeFormSeries,
  computeVo2maxSeries,
  computeWeeklyVolume,
  getFormZone,
} from "@/lib/training/metrics";
import {
  extractBestEfforts,
  fitCriticalSpeed,
} from "@/lib/training/critical-speed";
import { FormChart } from "@/components/charts/FormChart";
import { Vo2maxChart } from "@/components/charts/Vo2maxChart";
import { ActivityCalendar } from "@/components/charts/ActivityCalendar";
import { CriticalSpeedChart } from "@/components/charts/CriticalSpeedChart";
import { WeeklyVolumeChart } from "@/components/charts/WeeklyVolumeChart";
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

  const userActivities = db
    .select({
      id: activities.id,
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

  const profile = { hrMax: user.hrMax, hrRest: user.hrRest, lthrBpm: user.lthrBpm };

  const dailyLoads = fillGaps(userActivities);
  const series: FormPoint[] = computeFormSeries(dailyLoads);

  const lastPoint = series[series.length - 1];
  const currentCTL = lastPoint?.ctl ?? 0;
  const currentATL = lastPoint?.atl ?? 0;
  const currentTSB = lastPoint?.tsb ?? 0;
  const currentZone = getFormZone(currentTSB);

  const hasData = series.length > 0;

  const vo2maxSeries = computeVo2maxSeries(userActivities, profile);
  const vo2max = vo2maxSeries[vo2maxSeries.length - 1]?.ewmaVo2max ?? null;
  const weeklyVolume = computeWeeklyVolume(userActivities);

  const csEligible = userActivities.map((a) => ({
    durationSec: a.durationSec,
    distanceM: a.distanceM,
    avgPaceMperS: a.avgPaceMperS,
  }));
  const csPareto = extractBestEfforts(csEligible);
  const csModel  = fitCriticalSpeed(csPareto);
  

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {hasData
                ? `${userActivities.length} activit${userActivities.length !== 1 ? "ies" : "y"} recorded`
                : "No activities yet"}
            </p>
          </div>

          {hasData ? (
            <div className="space-y-6">
              <FormChart
                series={series}
                currentZone={currentZone}
                currentCTL={currentCTL}
                currentATL={currentATL}
                currentTSB={currentTSB}
                vo2max={vo2max}
              />
              <WeeklyVolumeChart series={weeklyVolume} />
              <ActivityCalendar activities={userActivities} />
              <Vo2maxChart series={vo2maxSeries} />
              <CriticalSpeedChart
                model={csModel}
                allEfforts={csEligible.filter(
                  (a) => a.durationSec >= 180 && a.durationSec <= 3000 && a.distanceM > 0 && a.avgPaceMperS != null
                )}
                paretoEfforts={csPareto}
              />
            </div>
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
