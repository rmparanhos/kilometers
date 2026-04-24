"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  TIME_WINDOWS,
  DEFAULT_TIME_WINDOW,
  type TimeWindow,
} from "@/lib/training/histograms";

interface Props {
  current: TimeWindow;
}

export function WindowSelector({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: TimeWindow) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_TIME_WINDOW) {
      params.delete("window");
    } else {
      params.set("window", next);
    }
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5 text-xs shadow-sm">
      {TIME_WINDOWS.map((w) => (
        <button
          key={w.value}
          type="button"
          onClick={() => handleChange(w.value)}
          className={
            current === w.value
              ? "rounded bg-gray-900 px-2.5 py-1 font-medium text-white"
              : "rounded px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}
