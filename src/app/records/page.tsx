import Link from "next/link";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatPace } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Canonical distances
// ---------------------------------------------------------------------------

const DISTANCES = [
  { label: "5 km",     m: 5_000  },
  { label: "10 km",    m: 10_000 },
  { label: "Half",     m: 21_097 },
  { label: "Marathon", m: 42_195 },
];

// 2% below canonical counts (GPS drift on exact-distance races)
const GPS_MARGIN = 0.02;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunEntry {
  id: string;
  startedAt: Date;
  distanceM: number;
  effectiveSec: number;   // durationSec scaled to canonical distance
  effectivePaceMperS: number;
  isTrimmed: boolean;     // true when distanceM > canonical * 1.02
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDelta(deltaSec: number): string {
  const abs = Math.round(Math.abs(deltaSec));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = deltaSec >= 0 ? "+" : "−";
  return m > 0
    ? `${sign}${m}:${String(s).padStart(2, "0")}`
    : `${sign}${s}s`;
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function DistanceCard({ label, runs }: { label: string; runs: RunEntry[] }) {
  if (runs.length === 0) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-base font-semibold text-foreground mb-1">{label}</h2>
          <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  const pr = runs[0];

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {runs.length} run{runs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href={`/activities/${pr.id}`} className="text-right group">
            <p className="text-2xl font-bold text-green-600 group-hover:text-green-500 transition-colors tabular-nums">
              {pr.isTrimmed && <span className="text-base mr-0.5 text-green-500/70">~</span>}
              {formatDuration(pr.effectiveSec)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPace(pr.effectivePaceMperS)} ·{" "}
              {pr.startedAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </Link>
        </div>

        {/* All attempts */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3 w-6">#</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Pace</th>
                <th className="pb-2">vs PR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {runs.map((run, i) => {
                const delta = run.effectiveSec - pr.effectiveSec;
                const isPR = i === 0;
                return (
                  <tr key={run.id} className={isPR ? "bg-green-50/60" : ""}>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      <Link href={`/activities/${run.id}`} className="hover:text-foreground transition-colors">
                        {run.startedAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums font-medium">
                      {run.isTrimmed && (
                        <span className="text-xs text-muted-foreground mr-0.5" title="Estimated for this distance">~</span>
                      )}
                      {formatDuration(run.effectiveSec)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                      {formatPace(run.effectivePaceMperS)}
                    </td>
                    <td className="py-2 tabular-nums">
                      {isPR ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          PR
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs">{formatDelta(delta)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {runs.some((r) => r.isTrimmed) && (
          <p className="text-xs text-muted-foreground mt-3">
            ~ estimated time — run was longer than {label}, pace projected to this distance
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RecordsPage() {
  const user = await getCurrentUser();

  const allRuns = user
    ? db
        .select({
          id: activities.id,
          startedAt: activities.startedAt,
          durationSec: activities.durationSec,
          distanceM: activities.distanceM,
          avgPaceMperS: activities.avgPaceMperS,
        })
        .from(activities)
        .where(and(eq(activities.userId, user.id), eq(activities.sport, "running")))
        .all()
    : [];

  const buckets = DISTANCES.map(({ label, m }) => {
    const runs: RunEntry[] = allRuns
      .filter((a) => a.distanceM >= m * (1 - GPS_MARGIN) && a.avgPaceMperS)
      .map((a) => {
        const effectiveSec = Math.round(a.durationSec * (m / a.distanceM));
        return {
          id: a.id,
          startedAt: a.startedAt,
          distanceM: a.distanceM,
          effectiveSec,
          effectivePaceMperS: m / effectiveSec,
          isTrimmed: a.distanceM > m * 1.02,
        };
      })
      .sort((a, b) => a.effectiveSec - b.effectiveSec)
      .slice(0, 10);

    return { label, runs };
  });

  const hasAny = buckets.some((b) => b.runs.length > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Records</h1>
            <p className="mt-1 text-sm text-gray-500">
              Top 10 per distance · longer runs are projected to the canonical distance at average pace
            </p>
          </div>

          {hasAny ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {buckets.map((b) => (
                <DistanceCard key={b.label} label={b.label} runs={b.runs} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
              <p className="text-sm text-gray-500">
                No activities yet. Upload a{" "}
                <code className="font-mono">.fit</code> or{" "}
                <code className="font-mono">.gpx</code> file to start tracking your records.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
