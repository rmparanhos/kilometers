"use client";

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { Vo2maxPoint } from "@/lib/training/metrics";

function Vo2maxTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-medium text-gray-500">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name}>
          {entry.name != "dateLabel" && (
            <p style={{ color: entry.color }} className="font-semibold">
              {entry.name === "ewmaVo2max" ? "Trend" : "Raw"}: {entry.value.toFixed(1)} mL/kg/min
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface Vo2maxChartProps {
  series: Vo2maxPoint[];
}

export function Vo2maxChart({ series }: Vo2maxChartProps) {
  if (series.length === 0) return null;

  const allValues = series.flatMap((p) => [p.vo2max, p.ewmaVo2max]);
  const domainMin = Math.max(20, Math.min(...allValues) - 3);
  const domainMax = Math.min(80, Math.max(...allValues) + 5);

  const latestEwma = series[series.length - 1]?.ewmaVo2max;

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              VO₂max Evolution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Per-activity estimate (dots) + 28-day trend (line) · Swain et al. (1994)
            </p>
          </div>
          {latestEwma != null && (
            <div className="text-right">
              <p className="text-xl font-bold text-violet-700">{latestEwma.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">mL/kg/min</p>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<Vo2maxTooltip />} />
            <ReferenceLine
              y={45}
              stroke="#c4b5fd"
              strokeDasharray="4 3"
              label={{
                value: "45 — good",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#8b5cf6",
              }}
            />
            <ReferenceLine
              y={55}
              stroke="#7c3aed"
              strokeDasharray="4 3"
              label={{
                value: "55 — excellent",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#6d28d9",
              }}
            />
            {/* Raw per-activity estimates as translucent scatter dots */}
            <Scatter
              dataKey="vo2max"
              fill="#c4b5fd"
              opacity={0.6}
              name="vo2max"
            />
            {/* EWMA trend line */}
            <Line
              type="monotone"
              dataKey="ewmaVo2max"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#7c3aed" }}
              name="ewmaVo2max"
            />
          </ComposedChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-400 mt-2">
          Reliability highest at submaximal efforts (HRR 40–97 %). The trend line uses
          time-decayed EWMA (τ = 28 days) — same principle as Garmin&apos;s VO₂max tracking.
        </p>
      </CardContent>
    </Card>
  );
}
