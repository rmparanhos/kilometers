"use client";

import { useState } from "react";
import { format, startOfWeek, subWeeks, eachDayOfInterval } from "date-fns";
import { formatDistance, formatDuration } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DaySummary {
  date: string;
  load: number;
  distanceM: number;
  durationSec: number;
}

export interface HeatmapCalendarProps {
  activities: {
    startedAt: Date;
    trainingLoad: number | null;
    distanceM: number;
    durationSec: number;
  }[];
}

// ---------------------------------------------------------------------------
// Colour scale
// ---------------------------------------------------------------------------

const COLORS = [
  "#e5e7eb", // 0 — rest day  (gray-200, visible on white)
  "#bfdbfe", // 1 — easy      (≤ 30)
  "#60a5fa", // 2 — moderate  (≤ 60)
  "#2563eb", // 3 — hard      (≤ 100)
  "#1e3a8a", // 4 — very hard (> 100)
];

const LEVEL_LABELS = ["Rest", "Easy", "Moderate", "Hard", "Very hard"];

function loadLevel(load: number): number {
  if (load <= 0) return 0;
  if (load <= 30) return 1;
  if (load <= 60) return 2;
  if (load <= 100) return 3;
  return 4;
}

// Show M / W / F labels on odd rows
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeatmapCalendar({ activities }: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<{
    day: DaySummary;
    x: number;
    y: number;
  } | null>(null);

  // Aggregate activities by calendar day
  const byDay = new Map<string, DaySummary>();
  for (const act of activities) {
    const key = format(act.startedAt, "yyyy-MM-dd");
    const prev = byDay.get(key) ?? { date: key, load: 0, distanceM: 0, durationSec: 0 };
    byDay.set(key, {
      date: key,
      load: prev.load + (act.trainingLoad ?? 0),
      distanceM: prev.distanceM + act.distanceM,
      durationSec: prev.durationSec + act.durationSec,
    });
  }

  // 52-week grid — each column = 1 week (7 rows = Sun–Sat)
  const today = new Date();
  const gridStart = startOfWeek(subWeeks(today, 51), { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: gridStart, end: today });

  // Split into columns of 7
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    const slice = allDays.slice(i, i + 7) as (Date | null)[];
    while (slice.length < 7) slice.push(null);
    weeks.push(slice);
  }

  // First week that starts each new month → month label
  const monthLabels = new Map<number, string>();
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find(Boolean);
    if (!first) return;
    const m = first.getMonth();
    if (m !== lastMonth) {
      monthLabels.set(wi, format(first, "MMM"));
      lastMonth = m;
    }
  });

  const GAP = 3; // px between cells

  return (
    <>
      <Card>
        <CardContent>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Training Load</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily training load — last 52 weeks
            </p>
          </div>

          {/* Month labels row */}
          <div className="flex items-end mb-1" style={{ gap: GAP }}>
            {/* spacer matching day-label column */}
            <div className="w-5 shrink-0" />
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="flex-1 min-w-0 text-xs text-muted-foreground"
              >
                {monthLabels.get(wi) ?? ""}
              </div>
            ))}
          </div>

          {/* Day-label column + week columns */}
          <div className="flex" style={{ gap: GAP }}>
            {/* Day labels — 7 rows matching cell rows */}
            <div className="w-5 shrink-0 flex flex-col" style={{ gap: GAP }}>
              {DAY_LABELS.map((lbl, i) => (
                <div
                  key={i}
                  className="flex-1 text-xs text-muted-foreground flex items-center justify-end pr-0.5"
                >
                  {lbl}
                </div>
              ))}
            </div>

            {/* 52 week columns — flex-1 fills the container */}
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="flex-1 flex flex-col"
                style={{ gap: GAP }}
              >
                {week.map((day, di) => {
                  const dateKey = day ? format(day, "yyyy-MM-dd") : null;
                  const data = dateKey
                    ? (byDay.get(dateKey) ?? { date: dateKey, load: 0, distanceM: 0, durationSec: 0 })
                    : null;
                  const level = loadLevel(data?.load ?? 0);

                  return (
                    <div
                      key={di}
                      className="w-full aspect-square rounded-[2px]"
                      style={{ backgroundColor: day ? COLORS[level] : "transparent" }}
                      onMouseEnter={(e) => {
                        if (data && day) setTooltip({ day: data, x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="text-xs text-muted-foreground">Less</span>
            {COLORS.map((color, i) => (
              <div
                key={i}
                className="size-3 rounded-[2px]"
                style={{ backgroundColor: color }}
                title={LEVEL_LABELS[i]}
              />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </CardContent>
      </Card>

      {/* Tooltip — outside Card to avoid overflow:hidden clipping */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground px-3 py-2 shadow-md text-xs"
          style={{ left: tooltip.x + 14, top: tooltip.y - 56 }}
        >
          <p className="font-medium mb-1">{tooltip.day.date}</p>
          {tooltip.day.load > 0 ? (
            <>
              <p className="text-muted-foreground">
                Load:{" "}
                <span className="font-medium text-foreground">
                  {tooltip.day.load.toFixed(1)}
                </span>
              </p>
              {tooltip.day.distanceM > 0 && (
                <p className="text-muted-foreground">
                  Distance:{" "}
                  <span className="font-medium text-foreground">
                    {formatDistance(tooltip.day.distanceM)}
                  </span>
                </p>
              )}
              {tooltip.day.durationSec > 0 && (
                <p className="text-muted-foreground">
                  Duration:{" "}
                  <span className="font-medium text-foreground">
                    {formatDuration(tooltip.day.durationSec)}
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Rest day</p>
          )}
        </div>
      )}
    </>
  );
}
