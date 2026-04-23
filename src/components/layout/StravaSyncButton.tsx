"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SyncError = { id: string; message: string };

type SyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; downloaded: number; created: number; alreadyHave: number; errors: SyncError[] }
  | { status: "error"; message: string };

export function StravaSyncButton() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>({ status: "idle" });

  async function handleSync() {
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/sync/strava", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Sync failed" });
        return;
      }

      setState({
        status: "success",
        downloaded: data.downloaded,
        created: data.created,
        alreadyHave: data.alreadyHave,
        errors: data.errors ?? [],
      });

      if (data.created > 0) {
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
        <StravaIcon className="w-4 h-4" />
        {state.status === "loading" ? "Syncing…" : "Sync Strava"}
      </Button>

      {state.status === "success" && (
        <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
          <p>
            {state.created > 0 ? `${state.created} imported` : "Already up to date"}
            {state.alreadyHave > 0 && ` · ${state.alreadyHave} existing`}
            {state.errors.length > 0 && (
              <span className="text-amber-600">
                {" "}· {state.errors.length} error{state.errors.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
          {state.errors.length > 0 && (
            <p className="text-amber-600 font-mono">
              {state.errors[0].id}: {state.errors[0].message}
              {state.errors.length > 1 && ` (+${state.errors.length - 1} more)`}
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

function StravaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-[#FC4C02]" {...props}>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
