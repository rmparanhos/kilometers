"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; imported: number; skipped: number; errors: number }
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
        errors: data.errors?.length ?? 0,
      });

      if (data.imported > 0) {
        router.refresh();
      }
    } catch {
      setState({ status: "error", message: "Erro de conexão" });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={state.status === "loading"}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
      >
        <GarminIcon />
        {state.status === "loading" ? "Sincronizando…" : "Sync Garmin"}
      </button>

      {state.status === "success" && (
        <p className="text-xs text-gray-500">
          {state.imported > 0
            ? `${state.imported} importada${state.imported !== 1 ? "s" : ""}`
            : "Tudo em dia"}
          {state.skipped > 0 && ` · ${state.skipped} já existia${state.skipped !== 1 ? "m" : ""}`}
          {state.errors > 0 && (
            <span className="text-amber-600"> · {state.errors} erro{state.errors !== 1 ? "s" : ""}</span>
          )}
        </p>
      )}

      {state.status === "error" && (
        <p className="text-xs text-red-500">{state.message}</p>
      )}
    </div>
  );
}

function GarminIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5 text-[#007CC3]"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
    </svg>
  );
}
