"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { HistogramBucket } from "@/lib/training/histograms";

interface HistogramProps {
  title: string;
  subtitle?: string;
  data: HistogramBucket[];
  color?: string;
  referenceValue?: number;
  referenceLabel?: string;
  valueLabel?: string;
  height?: number;
}

function HistogramTooltip({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean;
  payload?: { payload: HistogramBucket }[];
  label?: string;
  valueLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">
        {p.count} {valueLabel}
      </p>
    </div>
  );
}

export function Histogram({
  title,
  subtitle,
  data,
  color = "#0ea5e9",
  referenceValue,
  referenceLabel,
  valueLabel = "activities",
  height = 220,
}: HistogramProps) {
  if (data.length === 0 || data.every((b) => b.count === 0)) return null;

  return (
    <Card>
      <CardContent>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="10%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              content={<HistogramTooltip valueLabel={valueLabel} />}
              cursor={{ fill: "#f9fafb" }}
            />

            {referenceValue != null && (
              <ReferenceLine
                x={closestLabel(data, referenceValue)}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: referenceLabel ?? `${referenceValue}`,
                  position: "top",
                  fill: "#ef4444",
                  fontSize: 11,
                }}
              />
            )}

            <Bar
              dataKey="count"
              fill={color}
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function closestLabel(
  data: HistogramBucket[],
  value: number
): string | undefined {
  let best: HistogramBucket | undefined;
  let bestDist = Infinity;
  for (const b of data) {
    const d = Math.abs(b.center - value);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best?.label;
}
