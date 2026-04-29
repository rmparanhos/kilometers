import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { activities, activityLaps } from "@/lib/db/schema";
import { eq, and, ne, gte, lte, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Header } from "@/components/layout/Header";
import { formatDistance, formatDuration, formatPace } from "@/lib/utils";
import { parseRecords, parseRecordsFull } from "@/lib/parsers/records";
import { interpolateKmSplits } from "@/lib/training/km-splits";
import type { WeatherSnapshot } from "@/lib/weather";
import { ActivityChart } from "@/components/charts/ActivityChart";
import { KmSplitComparisonChart } from "@/components/charts/KmSplitComparisonChart";
import { KmPaceProgressionChart } from "@/components/charts/KmPaceProgressionChart";
import { Card, CardContent } from "@/components/ui/card";

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫";
  if (code <= 67) return "🌧";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦";
  if (code <= 86) return "🌨";
  return "⛈";
}

function StatItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={accent ? "pl-3 border-l-2" : ""} style={accent ? { borderColor: accent } : undefined}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold" style={{ color: accent ?? undefined }}>
        {value}
      </p>
    </div>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return notFound();

  const activity = db
    .select()
    .from(activities)
    .where(and(eq(activities.id, id), eq(activities.userId, user.id)))
    .get();

  if (!activity) return notFound();

  const laps = db
    .select()
    .from(activityLaps)
    .where(eq(activityLaps.activityId, id))
    .all();

  const records = parseRecords(activity.rawDataJson, activity.sourceFormat);

  // Km-split comparison — find best run of similar distance (±10%)
  const margin = activity.distanceM * 0.10;
  const comparables = db
    .select({
      id: activities.id,
      startedAt: activities.startedAt,
      durationSec: activities.durationSec,
      rawDataJson: activities.rawDataJson,
      sourceFormat: activities.sourceFormat,
    })
    .from(activities)
    .where(
      and(
        eq(activities.userId, user.id),
        eq(activities.sport, activity.sport),
        gte(activities.distanceM, activity.distanceM - margin),
        lte(activities.distanceM, activity.distanceM + margin),
        ne(activities.id, activity.id),
      )
    )
    .orderBy(asc(activities.durationSec))
    .all()
    .filter((a) => a.rawDataJson != null);

  const isBest = comparables.length > 0 && activity.durationSec <= comparables[0].durationSec;
  const reference = comparables[0] ?? null;

  const currentSplits = activity.rawDataJson
    ? interpolateKmSplits(parseRecordsFull(activity.rawDataJson, activity.sourceFormat))
    : [];
  const referenceSplits = reference
    ? interpolateKmSplits(parseRecordsFull(reference.rawDataJson, reference.sourceFormat))
    : [];

  const refDateStr = reference
    ? reference.startedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const weather: WeatherSnapshot | null = activity.weatherJson
    ? (() => {
        try {
          return JSON.parse(activity.weatherJson) as WeatherSnapshot;
        } catch {
          return null;
        }
      })()
    : null;

  const dateStr = activity.startedAt.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayName = activity.name ?? activity.sport ?? "Activity";
  const hasSecondaryStats =
    activity.trainingLoad != null ||
    activity.elevationGainM != null ||
    activity.avgCadenceRpm != null ||
    activity.maxHeartRateBpm != null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
          {/* Back link */}
          <Link
            href="/activities"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Activities
          </Link>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 capitalize">
                {displayName}
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
                {activity.sport}
              </span>
            </div>
            <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
          </div>

          {/* Primary stats */}
          <Card>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <StatItem label="Distance" value={formatDistance(activity.distanceM)} accent="#16a34a" />
                <StatItem label="Duration" value={formatDuration(activity.durationSec)} accent="#6366f1" />
                <StatItem label="Avg Pace" value={formatPace(activity.avgPaceMperS)} accent="#0ea5e9" />
                <StatItem
                  label="Avg HR"
                  accent="#ef4444"
                  value={
                    activity.avgHeartRateBpm
                      ? `${Math.round(activity.avgHeartRateBpm)} bpm`
                      : "—"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Secondary stats */}
          {hasSecondaryStats && (
            <Card>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {activity.trainingLoad != null && (
                    <StatItem
                      label={`Load (${activity.loadModel ?? "TSS"})`}
                      value={Math.round(activity.trainingLoad).toString()}
                    />
                  )}
                  {activity.elevationGainM != null && (
                    <StatItem
                      label="Elev. Gain"
                      value={`${Math.round(activity.elevationGainM)} m`}
                    />
                  )}
                  {activity.avgCadenceRpm != null && (
                    <StatItem
                      label="Cadence"
                      value={`${Math.round(activity.avgCadenceRpm)} spm`}
                    />
                  )}
                  {activity.maxHeartRateBpm != null && (
                    <StatItem
                      label="Max HR"
                      value={`${Math.round(activity.maxHeartRateBpm)} bpm`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weather */}
          {weather && (
            <Card>
              <CardContent>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Weather at start
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span>{weatherEmoji(weather.weatherCode)}</span>
                    <span className="font-medium">{weather.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span>🌡</span>
                    <span>
                      <span className="font-medium text-foreground">
                        {weather.tempC}°C
                      </span>{" "}
                      (feels {weather.feelsLikeC}°C)
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span>💧</span>
                    <span className="font-medium text-foreground">
                      {weather.humidityPct}%
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span>💨</span>
                    <span className="font-medium text-foreground">
                      {weather.windKph} km/h
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pace / HR chart */}
          {records.length > 0 && <ActivityChart records={records} />}

          {/* Km pace progression */}
          {currentSplits.length > 0 && (
            <KmPaceProgressionChart splits={currentSplits} />
          )}

          {/* Km split comparison */}
          {currentSplits.length > 0 && referenceSplits.length > 0 && (
            <KmSplitComparisonChart
              currentSplits={currentSplits}
              bestSplits={referenceSplits}
              currentDurationSec={activity.durationSec}
              referenceDurationSec={reference!.durationSec}
              bestDate={refDateStr}
              isBest={isBest}
            />
          )}

          {/* Lap splits */}
          {laps.length > 0 && (
            <Card>
              <CardContent>
                <h2 className="text-base font-semibold text-foreground mb-4">
                  Laps
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="pb-2 pr-4">Lap</th>
                        <th className="pb-2 pr-4">Distance</th>
                        <th className="pb-2 pr-4">Time</th>
                        <th className="pb-2 pr-4">Pace</th>
                        <th className="pb-2">Avg HR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {laps.map((lap) => (
                        <tr key={lap.id}>
                          <td className="py-2 pr-4 font-medium">
                            {lap.lapIndex + 1}
                          </td>
                          <td className="py-2 pr-4 tabular-nums">
                            {formatDistance(lap.distanceM)}
                          </td>
                          <td className="py-2 pr-4 tabular-nums">
                            {formatDuration(lap.durationSec)}
                          </td>
                          <td className="py-2 pr-4 tabular-nums">
                            {formatPace(lap.avgPaceMperS)}
                          </td>
                          <td className="py-2 tabular-nums">
                            {lap.avgHeartRateBpm
                              ? `${Math.round(lap.avgHeartRateBpm)} bpm`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
