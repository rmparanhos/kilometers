"use client";

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  hyperbolicCurve,
  predictTime,
  formatCSAsPace,
  formatDuration,
  type CriticalSpeedModel,
  type CriticalSpeedEffort,
} from "@/lib/training/critical-speed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paceMinKm(mPerS: number) {
  return 1000 / (mPerS * 60);
}

function formatPaceLabel(value: number) {
  const min = Math.floor(value);
  const sec = Math.round((value - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { t: number; pace: number; d?: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { t, pace, d } = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs space-y-0.5">
      <p className="font-medium text-gray-500">{Math.round(t)} min</p>
      <p className="text-gray-800">Pace: <span className="font-semibold">{formatPaceLabel(pace)} /km</span></p>
      {d != null && (
        <p className="text-gray-500">{(d / 1000).toFixed(2)} km</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race predictions table
// ---------------------------------------------------------------------------

const RACE_DISTANCES = [
  { label: "5 km",    m: 5_000 },
  { label: "10 km",   m: 10_000 },
  { label: "21.1 km", m: 21_097 },
  { label: "42.2 km", m: 42_195 },
];

function RacePredictions({ model }: { model: CriticalSpeedModel }) {
  const preds = RACE_DISTANCES.map(({ label, m }) => ({
    label,
    time: predictTime(model, m),
  }));

  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {preds.map(({ label, time }) => (
        <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {time != null ? formatDuration(time) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CriticalSpeedChartProps {
  model: CriticalSpeedModel | null;
  allEfforts: CriticalSpeedEffort[];
  keyEfforts: CriticalSpeedEffort[]; // one per duration bin, used for regression
}

export function CriticalSpeedChart({
  model,
  allEfforts,
  keyEfforts,
}: CriticalSpeedChartProps) {
  const hasEnoughData = allEfforts.length >= 2;

  // Convert efforts to chart points { t (min), pace (min/km), d (m) }
  const keySet = new Set(keyEfforts.map((e) => `${e.durationSec}|${e.distanceM}`));

  const allPoints = allEfforts.map((e) => ({
    t: e.durationSec / 60,
    pace: paceMinKm(e.distanceM / e.durationSec),
    d: e.distanceM,
    isKey: keySet.has(`${e.durationSec}|${e.distanceM}`),
  }));

  const nonKeyPoints = allPoints.filter((p) => !p.isKey);
  const keyPoints    = allPoints.filter((p) =>  p.isKey);

  const curvePoints = model ? hyperbolicCurve(model, 180, 3000, 80) : [];
  const csPaceMinKm = model ? paceMinKm(model.cs) : null;

  // Y-axis domain: cover all visible points with padding
  const allPaces = [...allPoints.map((p) => p.pace), ...(csPaceMinKm ? [csPaceMinKm] : [])];
  const paceMin = allPaces.length ? Math.max(2, Math.min(...allPaces) - 0.5) : 3;
  const paceMax = paceMin + 2

  const xDomain = [3, 51] as [number, number];

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Critical Speed</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hyperbolic speed-duration model · Monod &amp; Scherrer (1965) · Hill (1993)
            </p>
          </div>
          {model && (
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-violet-700">{formatCSAsPace(model.cs)}</p>
              <p className="text-xs text-muted-foreground">
                D&apos; {model.dPrime} m · R² {model.r2.toFixed(2)} · {model.nPoints} pts
              </p>
            </div>
          )}
        </div>

        {/* Race predictions */}
        {model && <RacePredictions model={model} />}

        {/* Chart */}
        {hasEnoughData ? (
          <ResponsiveContainer width="100%" height={240} className="mt-4">
            <ComposedChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                type="number"
                dataKey="t"
                domain={xDomain}
                name="Duration"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}m`}
                ticks={[5, 10, 15, 20, 30, 40, 50]}
              />
              <YAxis
                type="number"
                dataKey="pace"
                domain={[paceMin, paceMax]}
                reversed
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={formatPaceLabel}
                name="Pace"
              />
              <Tooltip content={<ChartTooltip />} />

              {/* CS asymptote reference line */}
              {csPaceMinKm != null && (
                <ReferenceLine
                  y={csPaceMinKm}
                  stroke="#7c3aed"
                  strokeDasharray="5 4"
                  label={{
                    value: `CS ${formatPaceLabel(csPaceMinKm)}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#7c3aed",
                  }}
                />
              )}

              {/* Fitted hyperbola (rendered as connected scatter = line) */}
              {curvePoints.length > 0 && (
                <Scatter
                  data={curvePoints}
                  line={{ stroke: "#7c3aed", strokeWidth: 2 }}
                  shape={() => null}
                  legendType="none"
                  isAnimationActive={false}
                />
              )}

              {/* All eligible efforts not used in fit */}
              {nonKeyPoints.length > 0 && (
                <Scatter
                  data={nonKeyPoints.filter((p) => p.pace <= paceMax)}
                  fill="#d1d5db"
                  opacity={0.8}
                  r={3}
                  name="Effort"
                />
              )}

              {/* Key efforts (best per duration bin) used for regression */}
              {keyPoints.length > 0 && (
                <Scatter
                  data={keyPoints}
                  fill="#16a34a"
                  r={4}
                  name="Best effort"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-200 py-10 text-center">
            <p className="text-sm text-gray-500">
              No eligible runs yet (3–50 min range).
            </p>
            <p className="text-xs text-gray-400 mt-1">
              The model needs at least 3 hard efforts at different durations to fit the curve.
            </p>
          </div>
        )}

        {/* Model quality / guidance note */}
        {model ? (
          <p className="text-xs text-gray-400 mt-3">
            Green dots = fastest run per duration range (used for fit). Gray = other eligible runs.
            {model.r2 < 0.92 && (
              <span className="text-amber-500 ml-1">
                R² {model.r2.toFixed(2)} — add efforts at more varied durations for a sharper model.
              </span>
            )}
          </p>
        ) : hasEnoughData ? (
          <p className="text-xs text-amber-500 mt-3">
            Runs found, but they cluster in too few duration ranges to fit the curve.
            The model needs fastest efforts spread across at least 3 of these windows:
            3–7 min, 7–12 min, 12–18 min, 18–28 min, 28–40 min, 40–50 min.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
