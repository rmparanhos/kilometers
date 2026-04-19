"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { WeeklyVolumePoint } from "@/lib/training/metrics";

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: WeeklyVolumePoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (p.activityCount === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs min-w-[140px]">
      <p className="font-medium text-gray-500 mb-1.5">Week of {label}</p>
      <p className="font-semibold text-green-700 text-sm">{p.distanceKm.toFixed(1)} km</p>
      {p.durationMin > 0 && (
        <p className="text-gray-500">{formatDuration(p.durationMin * 60)}</p>
      )}
      <p className="text-gray-500">
        {p.activityCount} activit{p.activityCount !== 1 ? "ies" : "y"}
      </p>
      {p.load > 0 && (
        <p className="text-gray-400">Load: {p.load.toFixed(0)}</p>
      )}
      <p className="text-amber-500 mt-1">
        4-wk avg: {p.rollingAvgKm.toFixed(1)} km
      </p>
    </div>
  );
}

interface WeeklyVolumeChartProps {
  series: WeeklyVolumePoint[];
}

export function WeeklyVolumeChart({ series }: WeeklyVolumeChartProps) {
  if (series.length === 0 || series.every((p) => p.distanceKm === 0)) return null;

  const maxKm = Math.max(...series.map((p) => p.distanceKm));
  const peakKm = maxKm;
  const currentWeek = series[series.length - 1];
  const last8 = series.slice(-8);
  const avgLast8 = last8.reduce((s, p) => s + p.distanceKm, 0) / last8.filter((p) => p.activityCount > 0).length || 0;

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Weekly Volume</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              km per week · 4-week rolling average
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">This week</p>
              <p className="text-lg font-semibold text-green-700">
                {currentWeek.distanceKm.toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">km</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak (year)</p>
              <p className="text-lg font-semibold text-foreground">
                {peakKm.toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">km</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg 8 wk</p>
              <p className="text-lg font-semibold text-foreground">
                {isNaN(avgLast8) ? "—" : avgLast8.toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground ml-0.5">km</span>
              </p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(series.length / 13)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={36}
              domain={[0, Math.ceil(maxKm * 1.2)]}
            />
            <Tooltip content={<VolumeTooltip />} />

            <Bar dataKey="distanceKm" name="km" radius={[2, 2, 0, 0]} maxBarSize={18}>
              {series.map((point, i) => (
                <Cell
                  key={i}
                  fill={point.activityCount > 0 ? "#16a34a" : "#f3f4f6"}
                  fillOpacity={point.activityCount > 0 ? 0.85 : 1}
                />
              ))}
            </Bar>

            <Line
              type="monotone"
              dataKey="rollingAvgKm"
              name="4-wk avg"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#f59e0b" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
