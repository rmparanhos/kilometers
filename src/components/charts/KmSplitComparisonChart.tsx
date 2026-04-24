"use client";

import {
  ComposedChart,
  Area,
  Line,
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

function paceMinKm(splitTimeSec: number): number {
  return splitTimeSec / 60;
}

function formatPace(minKm: number): string {
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDelta(sec: number): string {
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  const sign = sec > 0 ? "+" : "−";
  return m > 0 ? `${sign}${m}:${s.toString().padStart(2, "0")}` : `${sign}${s}s`;
}

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

interface ChartPoint {
  km: number;
  current: number;   // pace in min/km
  reference: number; // pace in min/km
  paceMin: number;   // min(current, reference) — bottom of the gap fill
  paceMax: number;   // max(current, reference) — top of the gap fill
  deltaSec: number;  // currentSplit - referenceSplit (positive = slower)
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-medium text-gray-500">km {d.km}</p>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-indigo-500 inline-block" />
        <span className="text-gray-800">This run: <span className="font-semibold">{formatPace(d.current)}</span></span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-gray-400 inline-block" />
        <span className="text-gray-500">Reference: <span className="font-medium">{formatPace(d.reference)}</span></span>
      </div>
      <p className={d.deltaSec <= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
        {formatDelta(d.deltaSec)} per km
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface KmSplitComparisonChartProps {
  currentSplits: KmSplit[];
  bestSplits: KmSplit[];
  bestDate: string;
  isBest: boolean;
}

export function KmSplitComparisonChart({
  currentSplits,
  bestSplits,
  bestDate,
  isBest,
}: KmSplitComparisonChartProps) {
  const numKms = Math.min(currentSplits.length, bestSplits.length);
  if (numKms === 0) return null;

  const points: ChartPoint[] = Array.from({ length: numKms }, (_, i) => {
    const cur = paceMinKm(currentSplits[i].splitTimeSec);
    const ref = paceMinKm(bestSplits[i].splitTimeSec);
    return {
      km: i + 1,
      current: cur,
      reference: ref,
      paceMin: Math.min(cur, ref),
      paceMax: Math.max(cur, ref),
      deltaSec: currentSplits[i].splitTimeSec - bestSplits[i].splitTimeSec,
    };
  });

  const allPaces = points.flatMap((p) => [p.current, p.reference]);
  const yMin = Math.max(2, Math.min(...allPaces) - 0.3);
  const yMax = Math.max(...allPaces) + 0.3;

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isBest ? "Compare with 2nd best" : "Compare with best"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isBest
                ? "Your best — comparing against 2nd best run of similar distance"
                : `Reference: ${bestDate}`}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-indigo-500 inline-block rounded" />
              This run
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-gray-400 inline-block rounded border-dashed" />
              Reference
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="km"
              type="number"
              domain={[1, numKms]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} km`}
              ticks={points.map((p) => p.km)}
            />
            <YAxis
              domain={[yMin, yMax]}
              reversed
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={formatPace}
            />
            <Tooltip content={<ChartTooltip />} />

            {/* Gap fill — paceMax area masked by paceMin white area */}
            <Area
              type="monotone"
              dataKey="paceMax"
              stroke="none"
              fill="url(#gapFill)"
              isAnimationActive={false}
              legendType="none"
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="paceMin"
              stroke="none"
              fill="white"
              isAnimationActive={false}
              legendType="none"
              dot={false}
              activeDot={false}
            />

            {/* Reference line (gray dashed) */}
            <Line
              type="monotone"
              dataKey="reference"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
              legendType="none"
            />

            {/* Current run line (indigo) */}
            <Line
              type="monotone"
              dataKey="current"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
              isAnimationActive={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-400 mt-2">
          Pace per km · Y axis reversed (faster = higher) · Shaded area shows the gap between runs
        </p>
      </CardContent>
    </Card>
  );
}
