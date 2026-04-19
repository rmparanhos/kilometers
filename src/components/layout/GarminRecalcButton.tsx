"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; created: number; updated: number; errors: { id: string; message: string }[] }
  | { status: "error"; message: string };

export function GarminDownloadButton() {
  const router = useRouter();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; downloaded: number; alreadyHave: number; errors: { garminActivityId: number; message: string }[] }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function handle() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/sync/garmin/download", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setState({ status: "error", message: data.error ?? "Download failed" }); return; }
      setState({ status: "success", downloaded: data.downloaded, alreadyHave: data.alreadyHave, errors: data.errors ?? [] });
      if (data.downloaded > 0) router.refresh();
    } catch {
      setState({ status: "error", message: "Connection error" });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={handle} disabled={state.status === "loading"}>
        <DownloadIcon data-icon="inline-start" />
        {state.status === "loading" ? "Downloading…" : "Download from Garmin"}
      </Button>
      {state.status === "success" && (
        <p className="text-xs text-muted-foreground">
          {state.downloaded > 0 ? `${state.downloaded} downloaded` : "Already up to date"}
          {state.alreadyHave > 0 && ` · ${state.alreadyHave} already saved`}
          {state.errors.length > 0 && <span className="text-amber-600"> · {state.errors.length} error(s)</span>}
        </p>
      )}
      {state.status === "error" && <p className="text-xs text-destructive">{state.message}</p>}
    </div>
  );
}

export function GarminRecalcButton() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });

  async function handle() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/sync/garmin/recalculate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setState({ status: "error", message: data.error ?? "Recalculate failed" }); return; }
      setState({ status: "success", created: data.created, updated: data.updated, errors: data.errors ?? [] });
      if (data.created > 0 || data.updated > 0) router.refresh();
    } catch {
      setState({ status: "error", message: "Connection error" });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={handle} disabled={state.status === "loading"}>
        <RecalcIcon data-icon="inline-start" />
        {state.status === "loading" ? "Recalculating…" : "Recalculate"}
      </Button>
      {state.status === "success" && (
        <p className="text-xs text-muted-foreground">
          {state.created > 0 && `${state.created} created`}
          {state.created > 0 && state.updated > 0 && " · "}
          {state.updated > 0 && `${state.updated} updated`}
          {state.created === 0 && state.updated === 0 && "Nothing to update"}
          {state.errors.length > 0 && <span className="text-amber-600"> · {state.errors.length} error(s)</span>}
        </p>
      )}
      {state.status === "error" && <p className="text-xs text-destructive">{state.message}</p>}
    </div>
  );
}

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="size-4" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function RecalcIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="size-4" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
