"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type TimeWindow = "4w" | "3m" | "6m" | "1y" | "all";

const OPTIONS: { label: string; value: TimeWindow }[] = [
  { label: "4w", value: "4w" },
  { label: "3m", value: "3m" },
  { label: "6m", value: "6m" },
  { label: "1y", value: "1y" },
  { label: "All", value: "all" },
];

interface TimeWindowSelectorProps {
  current: TimeWindow;
}

export function TimeWindowSelector({ current }: TimeWindowSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: TimeWindow) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("window");
    } else {
      params.set("window", value);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => select(opt.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            current === opt.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function windowToFromDate(window: TimeWindow): Date | null {
  const now = new Date();
  switch (window) {
    case "4w": {
      const d = new Date(now);
      d.setDate(d.getDate() - 28);
      return d;
    }
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "1y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "all":
      return null;
  }
}
