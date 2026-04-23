"use client";

import {
  ComposedChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { KmSplit } from "@/lib/training/km-splits";

function formatSplit(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDelta(sec: number): string {
  const abs = Math.abs(sec);
  const sign = sec >= 0 ? "+" : "−";
  return `${sign}${formatSplit(abs)}`;
}

interface ChartPoint {
  km: number;
  delta: number;        // currentSplit - bestSplit (positive = slower)
  current: number;
  best: number;
}

interface KmSplitComparisonChartProps {
  currentSplits: KmSplit[];
  bestSplits: KmSplit[];
  bestDate: string;
  isBest: boolean;      // true if the current activity IS the best
}

export function KmSplitComparisonChart({
  currentSplits,
  bestSplits,
  bestDate,
  isBest,
}: KmSplitComparisonChartProps) {
  const numKms = Math.min(currentSplits.length, bestSplits.length);
  if (numKms === 0) return null;

  const points: ChartPoint[] = Array.from({ length: numKms }, (_, i) => ({
    km: i + 1,
    delta: currentSplits[i].splitTimeSec - bestSplits[i].splitTimeSec,
    current: currentSplits[i].splitTimeSec,
    best: bestSplits[i].splitTimeSec,
  }));

  const maxAbs = Math.max(...points.map((p) => Math.abs(p.delta)), 10);
  const yDomain = [-maxAbs * 1.15, maxAbs * 1.15] as [number, number];

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
                ? "This is your best — comparing against 2nd best run of similar distance"
                : `Reference: ${bestDate}`}
            </p>
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
              domain={yDomain}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                const m = Math.floor(abs / 60);
                const s = Math.round(abs % 60);
                const sign = v >= 0 ? "+" : "−";
                return m > 0
                  ? `${sign}${m}:${s.toString().padStart(2, "0")}`
                  : `${sign}${s}s`;
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ChartPoint;
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-1">
                    <p className="font-medium text-gray-500">km {d.km}</p>
                    <p className="text-gray-800">
                      This run: <span className="font-semibold">{formatSplit(d.current)}</span>
                    </p>
                    <p className="text-gray-500">
                      Reference: <span className="font-medium">{formatSplit(d.best)}</span>
                    </p>
                    <p className={d.delta <= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {formatDelta(d.delta)} vs reference
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />
            <Bar dataKey="delta" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false}>
              {points.map((p) => (
                <Cell
                  key={p.km}
                  fill={p.delta <= 0 ? "#16a34a" : "#ef4444"}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-400 mt-2">
          Green = faster than reference · Red = slower · Bars show split time difference per km
        </p>
      </CardContent>
    </Card>
  );
}
