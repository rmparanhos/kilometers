"use client";

import { useState } from "react";

interface Props {
  initialName: string;
  initialHrMax: number | null;
  initialHrRest: number | null;
  initialLthrBpm: number | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileForm({ initialName, initialHrMax, initialHrRest, initialLthrBpm }: Props) {
  const [name, setName] = useState(initialName);
  const [hrMax, setHrMax] = useState(initialHrMax?.toString() ?? "");
  const [hrRest, setHrRest] = useState(initialHrRest?.toString() ?? "");
  const [lthrBpm, setLthrBpm] = useState(initialLthrBpm?.toString() ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");

    const body = {
      name: name || null,
      hrMax: hrMax ? Number(hrMax) : null,
      hrRest: hrRest ? Number(hrRest) : null,
      lthrBpm: lthrBpm ? Number(lthrBpm) : null,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  // Which TRIMP model will be used
  const model =
    hrMax && hrRest
      ? "Banister TRIMP (1991) — exponential HR reserve"
      : lthrBpm || (!hrMax && !hrRest)
      ? "Linear hrTSS (Manzi et al., 2009) — LTHR ratio"
      : "Duration fallback (60 TSS/hour)";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <hr className="border-gray-100" />

      {/* HR fields */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Heart rate profile</h2>
        <p className="text-xs text-gray-500 mb-4">
          Setting HR Max + HR Rest enables the Banister TRIMP model with exponential
          intensity weighting. Without them, the app falls back to the linear hrTSS model
          using LTHR.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <Field
            label="HR Max"
            unit="bpm"
            value={hrMax}
            onChange={setHrMax}
            placeholder="185"
            hint="Max heart rate"
          />
          <Field
            label="HR Rest"
            unit="bpm"
            value={hrRest}
            onChange={setHrRest}
            placeholder="50"
            hint="Resting heart rate"
          />
          <Field
            label="LTHR"
            unit="bpm"
            value={lthrBpm}
            onChange={setLthrBpm}
            placeholder="170"
            hint="Lactate threshold HR"
          />
        </div>
      </div>

      {/* Model preview */}
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">Active model: </span>
          {model}
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saveState === "saving"}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saveState === "saving" ? "Saving…" : "Save"}
        </button>
        {saveState === "saved" && (
          <p className="text-xs text-green-600">Saved — new activities will use the updated model.</p>
        )}
        {saveState === "error" && (
          <p className="text-xs text-red-500">Failed to save. Try again.</p>
        )}
      </div>
    </form>
  );
}

function Field({
  label, unit, value, onChange, placeholder, hint,
}: {
  label: string; unit: string; value: string;
  onChange: (v: string) => void; placeholder: string; hint: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} <span className="text-gray-400">({unit})</span>
      </label>
      <input
        type="number"
        min={30}
        max={250}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}
