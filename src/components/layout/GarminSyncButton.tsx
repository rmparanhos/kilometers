"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SyncError = { activityId: number; message: string };

type SyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; imported: number; skipped: number; errors: SyncError[] }
  | { status: "error"; message: string };

export function GarminSyncButton() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>({ status: "idle" });

  async function handleSync() {
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/sync/garmin", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Sync failed" });
        return;
      }

      setState({
        status: "success",
        imported: data.imported,
        skipped: data.skipped,
        errors: data.errors ?? [],
      });

      if (data.imported > 0) {
        router.refresh();
      }
    } catch {
      setState({ status: "error", message: "Connection error" });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={state.status === "loading"}
      >
        <GarminIcon data-icon="inline-start" />
        {state.status === "loading" ? "Syncing…" : "Sync Garmin"}
      </Button>

      {state.status === "success" && (
        <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
          <p>
            {state.imported > 0 ? `${state.imported} imported` : "Already up to date"}
            {state.skipped > 0 && ` · ${state.skipped} skipped`}
            {state.errors.length > 0 && (
              <span className="text-amber-600">
                {" "}· {state.errors.length} error{state.errors.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
          {state.errors.length > 0 && (
            <p className="text-amber-600 font-mono">
              {state.errors[0].activityId}: {state.errors[0].message}
              {state.errors.length > 1 && ` (+${state.errors.length - 1} more — see server log)`}
            </p>
          )}
        </div>
      )}

      {state.status === "error" && (
        <p className="text-xs text-destructive">{state.message}</p>
      )}
    </div>
  );
}

function GarminIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-[#007CC3]" {...props}>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
    </svg>
  );
}
