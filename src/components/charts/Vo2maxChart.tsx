"use client";

import {
  LineChart,
  Line,
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
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="mb-1 font-medium text-gray-500">{label}</p>
      <p className="font-semibold text-violet-700">
        {payload[0].value.toFixed(1)} mL/kg/min
      </p>
    </div>
  );
}

interface Vo2maxChartProps {
  series: Vo2maxPoint[];
}

export function Vo2maxChart({ series }: Vo2maxChartProps) {
  if (series.length === 0) return null;

  const values = series.map((p) => p.vo2max);
  const domainMin = Math.max(20, Math.min(...values) - 3);
  const domainMax = Math.min(80, Math.max(...values) + 5);

  return (
    <Card>
      <CardContent>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            VO₂max Evolution
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Estimated per activity from submaximal HR · Swain et al. (1994)
          </p>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart
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
            <Line
              type="monotone"
              dataKey="vo2max"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-400 mt-2">
          Estimate reliability is highest at submaximal efforts (HRR 40–97 %).
          Outliers from GPS noise or unusual pacing are expected.
        </p>
      </CardContent>
    </Card>
  );
}
