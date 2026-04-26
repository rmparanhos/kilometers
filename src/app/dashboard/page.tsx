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
import { parseRecordsFull } from "@/lib/parsers/records";
import { FormChart } from "@/components/charts/FormChart";
import { Vo2maxChart } from "@/components/charts/Vo2maxChart";
import { ActivityCalendar } from "@/components/charts/ActivityCalendar";
import { CriticalSpeedChart } from "@/components/charts/CriticalSpeedChart";
import { WeeklyVolumeChart } from "@/components/charts/WeeklyVolumeChart";
import { Header } from "@/components/layout/Header";
import { TimeWindowSelector } from "@/components/layout/TimeWindowSelector";
import { windowToFromDate, VALID_WINDOWS, type TimeWindow } from "@/lib/time-window";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { FormPoint } from "@/lib/training/metrics";
import { Suspense } from "react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
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

  const { window: windowParam } = await searchParams;
  const currentWindow: TimeWindow =
    windowParam && (VALID_WINDOWS as string[]).includes(windowParam)
      ? (windowParam as TimeWindow)
      : "all";
  const fromDate = windowToFromDate(currentWindow);

  const userActivities = db
    .select({
      id: activities.id,
      startedAt: activities.startedAt,
      trainingLoad: activities.trainingLoad,
      distanceM: activities.distanceM,
      durationSec: activities.durationSec,
      avgPaceMperS: activities.avgPaceMperS,
      avgHeartRateBpm: activities.avgHeartRateBpm,
      sport: activities.sport,
    })
    .from(activities)
    .where(eq(activities.userId, user.id))
    .orderBy(asc(activities.startedAt))
    .all();

  const profile = { hrMax: user.hrMax, hrRest: user.hrRest, lthrBpm: user.lthrBpm };

  // CTL/ATL/TSB: always compute from full history (cumulative model requires all data)
  const dailyLoads = fillGaps(userActivities);
  const fullSeries: FormPoint[] = computeFormSeries(dailyLoads);

  const lastPoint = fullSeries[fullSeries.length - 1];
  const currentCTL = lastPoint?.ctl ?? 0;
  const currentATL = lastPoint?.atl ?? 0;
  const currentTSB = lastPoint?.tsb ?? 0;
  const currentZone = getFormZone(currentTSB);

  // Slice series for display window only
  const displaySeries = fromDate
    ? fullSeries.filter((p) => p.date >= fromDate)
    : fullSeries;

  const hasData = fullSeries.length > 0;

  // Activities in the selected window (for charts that don't need cumulative history)
  const windowedActivities = fromDate
    ? userActivities.filter((a) => a.startedAt >= fromDate)
    : userActivities;

  const vo2maxSeries = computeVo2maxSeries(userActivities, profile);
  const displayVo2max = fromDate
    ? vo2maxSeries.filter((p) => p.date >= fromDate)
    : vo2maxSeries;
  const vo2max = vo2maxSeries[vo2maxSeries.length - 1]?.ewmaVo2max ?? null;

  const weeksMap: Record<TimeWindow, number> = {
    "4w": 6,
    "3m": 14,
    "6m": 26,
    "1y": 52,
    "all": 52,
  };
  const weeklyVolume = computeWeeklyVolume(userActivities, weeksMap[currentWindow]);

  // CS model — fast path: use only summary data (no rawDataJson needed)
  const csShortActivities = windowedActivities
    .filter((a) => a.distanceM > 0 && a.durationSec >= 180 && a.durationSec < 3000)
    .map((a) => ({ durationSec: a.durationSec, distanceM: a.distanceM }));

  let csPareto = extractBestEfforts(csShortActivities);
  let csModel  = fitCriticalSpeed(csPareto);

  // Slow path: if model failed and long runs exist, load their trackpoints so
  // sub-efforts can populate the duration bins (e.g. recreational runners doing 10km+).
  if (csModel === null) {
    const hasLongRuns = windowedActivities.some(
      (a) => a.durationSec >= 3000 && a.durationSec <= 7200 && a.distanceM > 0
    );
    if (hasLongRuns) {
      const longRunData = db
        .select({
          durationSec: activities.durationSec,
          distanceM: activities.distanceM,
          rawDataJson: activities.rawDataJson,
          sourceFormat: activities.sourceFormat,
        })
        .from(activities)
        .where(eq(activities.userId, user.id))
        .all()
        .filter((a) => a.durationSec >= 3000 && a.durationSec <= 7200 && a.distanceM > 0);

      const csAllActivities = [
        ...csShortActivities,
        ...longRunData.map((a) => ({
          durationSec: a.durationSec,
          distanceM: a.distanceM,
          records: parseRecordsFull(a.rawDataJson, a.sourceFormat),
        })),
      ];

      csPareto = extractBestEfforts(csAllActivities);
      csModel  = fitCriticalSpeed(csPareto);
    }
  }

  // allEfforts for the chart dots: all valid runs in the eligible window
  const allChartEfforts = windowedActivities.filter(
    (a) => a.distanceM > 0 && a.durationSec >= 180 && a.durationSec <= 7200
  ).filter((a) => a.sport == 'running');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-8 flex items-start justify-between">
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
            {hasData && (
              <Suspense>
                <TimeWindowSelector current={currentWindow} />
              </Suspense>
            )}
          </div>

          {hasData ? (
            <div className="space-y-6">
              <FormChart
                series={displaySeries}
                currentZone={currentZone}
                currentCTL={currentCTL}
                currentATL={currentATL}
                currentTSB={currentTSB}
                vo2max={vo2max}
              />
              <WeeklyVolumeChart series={weeklyVolume} />
              <ActivityCalendar activities={windowedActivities} />
              <Vo2maxChart series={displayVo2max} />
              <CriticalSpeedChart
                model={csModel}
                allEfforts={allChartEfforts}
                keyEfforts={csPareto}
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
