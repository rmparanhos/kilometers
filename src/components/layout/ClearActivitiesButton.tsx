"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <Button variant="destructive" size="sm" onClick={handleClear} disabled={loading}>
      {loading ? "Clearing…" : "Clear all"}
    </Button>
  );
}
