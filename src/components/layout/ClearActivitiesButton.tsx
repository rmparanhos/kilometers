"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearActivitiesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClear() {
    if (!window.confirm("Delete all activities? This cannot be undone.")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/activities", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        alert(data.error ?? "Failed to clear activities");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClear}
      disabled={loading}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
    >
      {loading ? "Clearing…" : "Clear all"}
    </button>
  );
}
