"use client";

import {
  ComposedChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { KmSplit } from "@/lib/training/km-splits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paceMinKm(splitSec: number) { return splitSec / 60; }

function formatPace(minKm: number): string {
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDeltaSec(sec: number): string {
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  const sign = sec > 0 ? "+" : "−";
  return m > 0 ? `${sign}${m}:${s.toString().padStart(2, "0")}` : `${sign}${s}s`;
}

// ---------------------------------------------------------------------------
// Data point type
// ---------------------------------------------------------------------------

interface ProgressionPoint {
  km: number;
  pace: number;        // min/km (Y axis)
  deltaSec: number;    // vs previous km (0 for km 1)
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ProgressionPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-0.5">
      <p className="font-medium text-gray-500">km {d.km}</p>
      <p className="text-gray-800">
        Pace: <span className="font-semibold">{formatPace(d.pace)} /km</span>
      </p>
      {d.km > 1 && (
        <p className={d.deltaSec <= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
          {formatDeltaSec(d.deltaSec)} vs prev km
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface KmPaceProgressionChartProps {
  splits: KmSplit[];
}

export function KmPaceProgressionChart({ splits }: KmPaceProgressionChartProps) {
  if (splits.length < 2) return null;

  const points: ProgressionPoint[] = splits.map((s, i) => ({
    km: s.km,
    pace: paceMinKm(s.splitTimeSec),
    deltaSec: i === 0 ? 0 : s.splitTimeSec - splits[i - 1].splitTimeSec,
  }));

  const avgPace = splits.reduce((sum, s) => sum + s.splitTimeSec, 0) / splits.length / 60;
  const allPaces = points.map((p) => p.pace);
  const paceMin = Math.max(2, Math.min(...allPaces) - 0.3);
  const paceMax = Math.max(...allPaces) + 0.3;

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pace Progression</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Split pace per km · green = faster than previous · red = slower
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-indigo-600">{formatPace(avgPace)}</p>
            <p className="text-xs text-muted-foreground">avg /km</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="km"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} km`}
            />
            <YAxis
              type="number"
              domain={[paceMin, paceMax]}
              reversed
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={formatPace}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={avgPace}
              stroke="#6366f1"
              strokeDasharray="5 4"
              label={{
                value: `avg ${formatPace(avgPace)}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "#6366f1",
              }}
            />
            <Bar dataKey="pace" maxBarSize={32} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {points.map((p) => (
                <Cell
                  key={p.km}
                  fill={p.km === 1 ? "#9ca3af" : p.deltaSec <= 0 ? "#16a34a" : "#ef4444"}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-400 mt-2">
          Dashed line = average pace · first km shown in gray (no prior reference)
        </p>
      </CardContent>
    </Card>
  );
}
