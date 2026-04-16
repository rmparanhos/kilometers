"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { NormalizedRecord } from "@/lib/parsers/records";

interface ChartPoint {
  distanceKm: number;
  paceSecPerKm?: number;
  hr?: number;
}

function formatPaceTick(value: number): string {
  if (!value || value <= 0) return "";
  const m = Math.floor(value / 60);
  const s = Math.round(value % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs min-w-[140px]">
      <p className="mb-1.5 font-medium text-gray-500">
        {typeof label === "number" ? label.toFixed(2) + " km" : label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900 ml-auto">
            {p.name === "Pace"
              ? formatPaceTick(p.value) + " /km"
              : p.value + " bpm"}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ActivityChartProps {
  records: NormalizedRecord[];
}

export function ActivityChart({ records }: ActivityChartProps) {
  const hasHr = records.some((r) => r.hr != null);
  const hasSpeed = records.some((r) => r.speedMperS != null && r.speedMperS > 0.5);

  if (!hasHr && !hasSpeed) return null;

  const data: ChartPoint[] = records.map((r) => ({
    distanceKm: Math.round((r.distanceM / 1000) * 100) / 100,
    paceSecPerKm:
      r.speedMperS && r.speedMperS > 0.5
        ? Math.round(1000 / r.speedMperS)
        : undefined,
    hr: r.hr,
  }));

  const paceSamples = data
    .filter((d) => d.paceSecPerKm != null)
    .map((d) => d.paceSecPerKm!);
  const paceMin = paceSamples.length ? Math.min(...paceSamples) - 10 : 120;
  const paceMax = paceSamples.length
    ? Math.min(Math.max(...paceSamples) + 60, 900)
    : 600;

  return (
    <Card>
      <CardContent>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Pace &amp; Heart Rate
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">By distance</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="distanceKm"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => `${v} km`}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            {hasSpeed && (
              <YAxis
                yAxisId="pace"
                orientation="left"
                domain={[paceMin, paceMax]}
                reversed
                tickFormatter={formatPaceTick}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
            )}
            {hasHr && (
              <YAxis
                yAxisId="hr"
                orientation="right"
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
            )}
            <Tooltip content={<ActivityTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 12 }}
            />
            {hasSpeed && (
              <Line
                yAxisId="pace"
                type="monotone"
                dataKey="paceSecPerKm"
                name="Pace"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
              />
            )}
            {hasHr && (
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="hr"
                name="Heart Rate"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
