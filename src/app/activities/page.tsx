import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { ClearActivitiesButton } from "@/components/layout/ClearActivitiesButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDistance, formatDuration, formatPace } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function ModelBadge({ model }: { model: string | null }) {
  if (!model) return <span className="text-muted-foreground">—</span>;
  const cfg: Record<string, { text: string; className: string }> = {
    banister: { text: "TRIMP", className: "bg-blue-100 text-blue-700 border-blue-200" },
    hr_tss:   { text: "hrTSS", className: "bg-amber-100 text-amber-700 border-amber-200" },
    duration: { text: "dur.",  className: "" },
  };
  const { text, className } = cfg[model] ?? { text: model, className: "" };
  return (
    <Badge variant="outline" className={className}>
      {text}
    </Badge>
  );
}

export default async function ActivitiesPage() {
  const user = await getCurrentUser();
  const userId = user?.id ?? "";

  const userActivities = db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.startedAt))
    .all();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Activities
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {userActivities.length} total
              </span>
              {userActivities.length > 0 && <ClearActivitiesButton />}
            </div>
          </div>

          {userActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center">
              <p className="text-sm text-gray-500">
                No activities yet. Upload a .fit or .gpx file via{" "}
                <code className="font-mono text-xs">POST /api/activities/upload</code>.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Distance</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Duration</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Pace</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Avg HR</th>
                    <th className="px-4 py-3 font-medium text-gray-500">TSS</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {userActivities.map((act) => (
                    <tr
                      key={act.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500 tabular-nums">
                        {act.startedAt.toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <a
                          href={`/activities/${act.id}`}
                          className="hover:underline"
                        >
                          {act.name ?? act.sport ?? "Activity"}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {formatDistance(act.distanceM)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {formatDuration(act.durationSec)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {formatPace(act.avgPaceMperS)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {act.avgHeartRateBpm != null
                          ? `${Math.round(act.avgHeartRateBpm)} bpm`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {act.trainingLoad != null
                          ? act.trainingLoad.toFixed(1)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ModelBadge model={act.loadModel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
