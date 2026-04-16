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
// Helpers
// ---------------------------------------------------------------------------

const LEVELS = [0, 30, 60, 100] as const;
const COLORS = [
  "#f3f4f6", // 0 — rest day
  "#bfdbfe", // 1 — easy  (≤ 30)
  "#60a5fa", // 2 — moderate (≤ 60)
  "#2563eb", // 3 — hard (≤ 100)
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

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const DAY_LABELS = ["", "M", "", "W", "", "F", ""];

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

  // Build 52-week grid starting from the Sunday of the week 51 weeks ago
  const today = new Date();
  const gridStart = startOfWeek(subWeeks(today, 51), { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: gridStart, end: today });

  // Split into columns of 7 (one column = one week)
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    const week = allDays.slice(i, i + 7);
    // Pad the last partial week to 7 slots
    while (week.length < 7) week.push(null as unknown as Date);
    weeks.push(week);
  }

  // Month label for the first week that starts a new month
  const monthLabels: Map<number, string> = new Map();
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

  return (
    <>
      <Card>
        <CardContent>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Training Load</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily training load — last 52 weeks</p>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Month labels */}
              <div className="flex mb-1" style={{ paddingLeft: 20 }}>
                {weeks.map((_, wi) => (
                  <div
                    key={wi}
                    className="text-xs text-muted-foreground flex-shrink-0"
                    style={{ width: STEP }}
                  >
                    {monthLabels.get(wi) ?? ""}
                  </div>
                ))}
              </div>

              <div className="flex">
                {/* Day-of-week labels */}
                <div className="flex flex-col flex-shrink-0 mr-1" style={{ gap: GAP }}>
                  {DAY_LABELS.map((lbl, i) => (
                    <div
                      key={i}
                      className="text-xs text-muted-foreground/50 flex items-center justify-end pr-1"
                      style={{ height: CELL, width: 16 }}
                    >
                      {lbl}
                    </div>
                  ))}
                </div>

                {/* Week columns */}
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    className="flex flex-col flex-shrink-0"
                    style={{ gap: GAP, marginRight: GAP }}
                  >
                    {week.map((day, di) => {
                      if (!day) {
                        return <div key={di} style={{ width: CELL, height: CELL }} />;
                      }
                      const dateKey = format(day, "yyyy-MM-dd");
                      const data = byDay.get(dateKey) ?? {
                        date: dateKey, load: 0, distanceM: 0, durationSec: 0,
                      };
                      const level = loadLevel(data.load);
                      return (
                        <div
                          key={di}
                          style={{ width: CELL, height: CELL, backgroundColor: COLORS[level], borderRadius: 2 }}
                          onMouseEnter={(e) => setTooltip({ day: data, x: e.clientX, y: e.clientY })}
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
                    style={{ width: CELL, height: CELL, backgroundColor: color, borderRadius: 2 }}
                    title={LEVEL_LABELS[i]}
                  />
                ))}
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating tooltip — outside Card to avoid overflow:hidden clipping */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground px-3 py-2 shadow-md text-xs"
          style={{ left: tooltip.x + 14, top: tooltip.y - 56 }}
        >
          <p className="font-medium mb-1">{tooltip.day.date}</p>
          {tooltip.day.load > 0 ? (
            <>
              <p className="text-muted-foreground">
                Load: <span className="font-medium text-foreground">{tooltip.day.load.toFixed(1)}</span>
              </p>
              {tooltip.day.distanceM > 0 && (
                <p className="text-muted-foreground">
                  Distance: <span className="font-medium text-foreground">{formatDistance(tooltip.day.distanceM)}</span>
                </p>
              )}
              {tooltip.day.durationSec > 0 && (
                <p className="text-muted-foreground">
                  Duration: <span className="font-medium text-foreground">{formatDuration(tooltip.day.durationSec)}</span>
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
