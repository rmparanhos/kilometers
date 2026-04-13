import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { fillGaps, computeFormSeries, getFormZone } from "@/lib/training/metrics";
import { FormChart } from "@/components/charts/FormChart";
import { Header } from "@/components/layout/Header";
import { GarminSyncButton } from "@/components/layout/GarminSyncButton";
import type { FormPoint } from "@/lib/training/metrics";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as { id: string }).id;

  // Fetch all activities for this user ordered by date
  const userActivities = db
    .select({
      startedAt: activities.startedAt,
      trainingLoad: activities.trainingLoad,
    })
    .from(activities)
    .where(eq(activities.userId, userId))
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
            {process.env.GARMIN_EMAIL && <GarminSyncButton />}
          </div>

          {hasData ? (
            <FormChart
              series={series}
              currentZone={currentZone}
              currentCTL={currentCTL}
              currentATL={currentATL}
              currentTSB={currentTSB}
            />
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
