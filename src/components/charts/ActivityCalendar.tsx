"use client";

import { useState } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { formatDistance, formatPace } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface CalActivity {
  id: string;
  startedAt: Date;
  distanceM: number;
  avgPaceMperS: number | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ActivityCalendar({ activities }: { activities: CalActivity[] }) {
  const [current, setCurrent] = useState<Date>(() => startOfMonth(new Date()));

  const today = new Date();
  const firstDay = startOfMonth(current);
  const lastDay = endOfMonth(current);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay);
  const isCurrentMonth = isSameMonth(current, today);

  // Group activities in the current month by day key
  const byDay = new Map<string, CalActivity[]>();
  for (const act of activities) {
    if (!isSameMonth(act.startedAt, current)) continue;
    const key = format(act.startedAt, "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), act]);
  }

  const monthActs = activities.filter((a) => isSameMonth(a.startedAt, current));

  // Build flat cell array (null = padding, Date = real day)
  const cells: (Date | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {format(current, "MMMM yyyy")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {monthActs.length} activit{monthActs.length !== 1 ? "ies" : "y"}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrent(subMonths(current, 1))}
              className="px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              onClick={() => setCurrent(addMonths(current, 1))}
              disabled={isCurrentMonth}
              className="px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="min-h-[76px]" />;

            const key = format(day, "yyyy-MM-dd");
            const dayActs = byDay.get(key) ?? [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={[
                  "min-h-[76px] rounded-lg p-1.5",
                  isToday
                    ? "ring-1 ring-blue-400 bg-blue-50/50"
                    : dayActs.length > 0
                    ? "bg-gray-50/80"
                    : "",
                ].join(" ")}
              >
                <p
                  className={`text-xs font-medium mb-1 ${
                    isToday ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <div className="flex flex-col gap-0.5">
                  {dayActs.map((act) => (
                    <Link
                      key={act.id}
                      href={`/activities/${act.id}`}
                      className="block rounded px-1 py-0.5 bg-blue-100 hover:bg-blue-200 transition-colors"
                    >
                      <p className="text-[10px] font-semibold text-blue-800 leading-tight truncate">
                        {formatDistance(act.distanceM)}
                      </p>
                      {act.avgPaceMperS != 0 && (
                        <p className="text-[10px] text-blue-600 leading-tight">
                          {formatPace(act.avgPaceMperS)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
