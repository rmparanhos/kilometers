"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import type { FormPoint, FormZone } from "@/lib/training/metrics";
import { ZONE_LABELS } from "@/lib/training/metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormChartProps {
  series: FormPoint[];
  currentZone: FormZone;
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
}

// ---------------------------------------------------------------------------
// Zone color map
// ---------------------------------------------------------------------------

const ZONE_COLORS: Record<FormZone, string> = {
  peak: "#22c55e",        // green-500
  fresh: "#84cc16",       // lime-500
  neutral: "#f59e0b",     // amber-500
  fatigued: "#f97316",    // orange-500
  overreached: "#ef4444", // red-500
};

// ---------------------------------------------------------------------------
// Activity dot — rendered on the CTL line only on days with a workout
// ---------------------------------------------------------------------------

function ActivityDot(props: {
  cx?: number;
  cy?: number;
  payload?: FormPoint;
}) {
  const { cx, cy, payload } = props;
  if (!payload?.hasActivity || cx == null || cy == null) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill="#3b82f6"
      stroke="white"
      strokeWidth={1.5}
    />
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function FormTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload: FormPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const hasActivity = payload[0]?.payload?.hasActivity;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md text-sm">
      <p className="mb-2 font-medium text-gray-600">{label}</p>
      {hasActivity && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-blue-500 font-medium">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Activity logged
        </p>
      )}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900">{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold" style={{ color }}>
        {value.toFixed(1)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FormChart({
  series,
  currentZone,
  currentCTL,
  currentATL,
  currentTSB,
}: FormChartProps) {
  const zoneInfo = ZONE_LABELS[currentZone];
  const zoneColor = ZONE_COLORS[currentZone];

  // Thin the data for large series: keep one point per week, but always
  // preserve days with activities so the activity dots are never hidden.
  const displaySeries =
    series.length > 180
      ? series.filter(
          (p, i) =>
            i % 7 === 0 || i === series.length - 1 || p.hasActivity
        )
      : series;

  return (
    <div className="space-y-6">
      {/* Contextual insight */}
      <div
        className="rounded-xl border px-5 py-4"
        style={{ borderColor: zoneColor + "40", backgroundColor: zoneColor + "10" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: zoneColor }}
          />
          <div>
            <p className="font-semibold text-gray-900" style={{ color: zoneColor }}>
              {zoneInfo.label}
            </p>
            <p className="mt-0.5 text-sm text-gray-600">{zoneInfo.advice}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Fitness (CTL)" value={currentCTL} color="#3b82f6" />
        <StatCard label="Fatigue (ATL)" value={currentATL} color="#f97316" />
        <StatCard label="Form (TSB)" value={currentTSB} color={zoneColor} />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Performance Manager Chart
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            CTL = fitness · ATL = fatigue · TSB = form (CTL − ATL) · dots = activities · shaded band = race window (TSB 5–25)
          </p>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={displaySeries}
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
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<FormTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 12 }}
            />
            {/* Sweet spot: TSB 5–25 — race-ready window */}
            <ReferenceArea
              y1={5}
              y2={25}
              fill="#22c55e"
              fillOpacity={0.07}
              label={{
                value: "race window",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#16a34a",
              }}
            />
            {/* Zero baseline for TSB context */}
            <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 4" />

            <Line
              type="monotone"
              dataKey="ctl"
              name="CTL (Fitness)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={<ActivityDot />}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="atl"
              name="ATL (Fatigue)"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="tsb"
              name="TSB (Form)"
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scientific references */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Model based on the Banister impulse–response framework.{" "}
        <a
          href="https://doi.org/10.1152/jappl.1990.69.3.1171"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          Morton, Fitz-Clarke &amp; Banister (1990)
        </a>
        {" · "}
        <a
          href="https://doi.org/10.1007/s40279-017-0703-z"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          Bourdon et al. (2017)
        </a>
      </p>
    </div>
  );
}
