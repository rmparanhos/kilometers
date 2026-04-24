"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Cell,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { KmSplit } from "@/lib/training/km-splits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ViewMode = "split" | "cumulative";

function paceMinKm(sec: number) { return sec / 60; }

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
// Split tooltip
// ---------------------------------------------------------------------------

interface SplitPoint {
  km: number;
  current: number;
  reference: number;
  paceMin: number;
  paceMax: number;
  deltaSec: number;
}

function SplitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SplitPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-medium text-gray-500">km {d.km}</p>
      <p className="text-gray-800">This run: <span className="font-semibold">{formatPace(d.current)}</span></p>
      <p className="text-gray-500">Reference: <span className="font-medium">{formatPace(d.reference)}</span></p>
      <p className={d.deltaSec <= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
        {formatDelta(d.deltaSec)} this km
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cumulative tooltip
// ---------------------------------------------------------------------------

interface CumPoint {
  km: number;
  cumDelta: number;
  positive: number;   // max(0, cumDelta) — for red fill
  negative: number;   // min(0, cumDelta) — for green fill
}

function CumTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CumPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-medium text-gray-500">km {d.km}</p>
      <p className={d.cumDelta <= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
        {formatDelta(d.cumDelta)} cumulative
      </p>
      <p className="text-gray-400">
        {d.cumDelta <= 0 ? "ahead of reference" : "behind reference"}
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
  currentDurationSec: number;
  referenceDurationSec: number;
  bestDate: string;
  isBest: boolean;
}

export function KmSplitComparisonChart({
  currentSplits,
  bestSplits,
  currentDurationSec,
  referenceDurationSec,
  bestDate,
  isBest,
}: KmSplitComparisonChartProps) {
  const [view, setView] = useState<ViewMode>("split");

  const numKms = Math.min(currentSplits.length, bestSplits.length);
  if (numKms === 0) return null;

  // Split view data
  const splitPoints: SplitPoint[] = Array.from({ length: numKms }, (_, i) => {
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

  // Cumulative view data (km 0 = start, so we prepend the origin)
  let cumAcc = 0;
  const cumPoints: CumPoint[] = [
    { km: 0, cumDelta: 0, positive: 0, negative: 0 },
    ...Array.from({ length: numKms }, (_, i) => {
      cumAcc += currentSplits[i].splitTimeSec - bestSplits[i].splitTimeSec;
      return {
        km: i + 1,
        cumDelta: cumAcc,
        positive: Math.max(0, cumAcc),
        negative: Math.min(0, cumAcc),
      };
    }),
  ];

  const cumAbsMax = Math.max(...cumPoints.map((p) => Math.abs(p.cumDelta)), 10);
  const cumYDomain = [-cumAbsMax * 1.2, cumAbsMax * 1.2] as [number, number];

  const totalDelta = currentDurationSec - referenceDurationSec;
  const totalAbs = Math.abs(totalDelta);
  const totalSign = totalDelta > 0 ? "+" : "−";

  return (
    <Card>
      <CardContent>
        {/* Header row */}
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
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-0.5 w-4 bg-indigo-500 inline-block rounded" />
                <span className="font-semibold text-indigo-600 text-sm">{formatDuration(currentDurationSec)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-0.5 w-4 bg-gray-400 inline-block rounded" />
                <span className="font-semibold text-gray-500 text-sm">{formatDuration(referenceDurationSec)}</span>
              </span>
            </div>
            <p className={`text-xs font-semibold mt-0.5 ${totalDelta <= 0 ? "text-green-600" : "text-red-500"}`}>
              {totalSign}{formatDuration(totalAbs)} overall
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit mb-4">
          {(["split", "cumulative"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize ${
                view === v
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "split" ? "Split" : "Cumulative"}
            </button>
          ))}
        </div>

        {/* Split view — bar chart of delta per km */}
        {view === "split" && (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={splitPoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="km"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} km`}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={formatDelta}
              />
              <Tooltip content={<SplitTooltip />} />
              <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />
              <Bar dataKey="deltaSec" maxBarSize={32} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {splitPoints.map((p) => (
                  <Cell key={p.km} fill={p.deltaSec <= 0 ? "#16a34a" : "#ef4444"} opacity={0.8} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Cumulative view */}
        {view === "cumulative" && (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={cumPoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="km"
                type="number"
                domain={[0, numKms]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v === 0 ? "start" : `${v} km`}
              />
              <YAxis
                domain={cumYDomain}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={formatDelta}
              />
              <Tooltip content={<CumTooltip />} />
              <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />
              {/* Red fill above 0 (behind) */}
              <Area type="monotone" dataKey="positive" stroke="none"
                fill="#ef4444" fillOpacity={0.15} isAnimationActive={false}
                legendType="none" dot={false} activeDot={false} />
              {/* Green fill below 0 (ahead) */}
              <Area type="monotone" dataKey="negative" stroke="none"
                fill="#16a34a" fillOpacity={0.15} isAnimationActive={false}
                legendType="none" dot={false} activeDot={false} />
              {/* Main gap line */}
              <Line type="monotone" dataKey="cumDelta" stroke="#6366f1" strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} isAnimationActive={false}
                legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {view === "split"
            ? "Seconds per km vs reference · green = faster · red = slower"
            : "Cumulative time gap · line above zero = behind reference · below zero = ahead"}
        </p>
      </CardContent>
    </Card>
  );
}
