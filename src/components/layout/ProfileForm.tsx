"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Props {
  initialName: string;
  initialHrMax: number | null;
  initialHrRest: number | null;
  initialLthrBpm: number | null;
  initialGarminEmail: string;
  initialGarminPassword: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileForm({
  initialName,
  initialHrMax,
  initialHrRest,
  initialLthrBpm,
  initialGarminEmail,
  initialGarminPassword,
}: Props) {
  const [name, setName] = useState(initialName);
  const [hrMax, setHrMax] = useState(initialHrMax?.toString() ?? "");
  const [hrRest, setHrRest] = useState(initialHrRest?.toString() ?? "");
  const [lthrBpm, setLthrBpm] = useState(initialLthrBpm?.toString() ?? "");
  const [garminEmail, setGarminEmail] = useState(initialGarminEmail);
  const [garminPassword, setGarminPassword] = useState(initialGarminPassword);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [recalcCount, setRecalcCount] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setRecalcCount(null);

    const body = {
      name: name || null,
      hrMax: hrMax ? Number(hrMax) : null,
      hrRest: hrRest ? Number(hrRest) : null,
      lthrBpm: lthrBpm ? Number(lthrBpm) : null,
      garminEmail: garminEmail || null,
      garminPassword: garminPassword || null,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSaveState("saved");
        if (typeof data.recalculated === "number") setRecalcCount(data.recalculated);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  const model =
    hrMax && hrRest
      ? "Banister TRIMP (1991) — exponential HR reserve"
      : hrMax || hrRest
      ? "Linear hrTSS (Manzi et al., 2009) — incomplete Banister profile"
      : lthrBpm
      ? "Linear hrTSS (Manzi et al., 2009) — LTHR ratio"
      : "Duration fallback (60 TSS/hour)";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <Separator />

      {/* Heart rate profile */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Heart rate profile</p>
          <p className="text-xs text-muted-foreground mt-1">
            Setting HR Max + HR Rest enables the Banister TRIMP model with exponential
            intensity weighting. Without them, the app falls back to the linear hrTSS model
            using LTHR. Saving will recalculate all existing activities.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <HrField label="HR Max" unit="bpm" value={hrMax} onChange={setHrMax} placeholder="185" hint="Max heart rate" />
          <HrField label="HR Rest" unit="bpm" value={hrRest} onChange={setHrRest} placeholder="50" hint="Resting heart rate" />
          <HrField label="LTHR" unit="bpm" value={lthrBpm} onChange={setLthrBpm} placeholder="170" hint="Lactate threshold HR" />
        </div>

        {/* Active model preview */}
        <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Active model: </span>
            {model}
          </p>
        </div>
      </div>

      <Separator />

      {/* Garmin Connect */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Garmin Connect</p>
          <p className="text-xs text-muted-foreground mt-1">
            Credentials are stored locally in the database and used only to sync activities
            from Garmin Connect.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garmin-email">Email</Label>
            <Input
              id="garmin-email"
              type="email"
              value={garminEmail}
              onChange={(e) => setGarminEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garmin-password">Password</Label>
            <Input
              id="garmin-password"
              type="password"
              value={garminPassword}
              onChange={(e) => setGarminPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saveState === "saving"}>
          {saveState === "saving" ? "Saving…" : "Save"}
        </Button>
        {saveState === "saved" && (
          <p className="text-xs text-green-600">
            Saved.{recalcCount != null && recalcCount > 0
              ? ` Recalculated ${recalcCount} activit${recalcCount !== 1 ? "ies" : "y"}.`
              : ""}
          </p>
        )}
        {saveState === "error" && (
          <p className="text-xs text-destructive">Failed to save. Try again.</p>
        )}
      </div>
    </form>
  );
}

function HrField({
  label, unit, value, onChange, placeholder, hint,
}: {
  label: string; unit: string; value: string;
  onChange: (v: string) => void; placeholder: string; hint: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label} <span className="text-muted-foreground font-normal">({unit})</span>
      </Label>
      <Input
        id={id}
        type="number"
        min={30}
        max={250}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
