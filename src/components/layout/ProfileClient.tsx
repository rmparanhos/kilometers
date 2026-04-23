"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { GarminDownloadButton, GarminRecalcButton } from "@/components/layout/GarminRecalcButton";
import { StravaSyncButton } from "@/components/layout/StravaSyncButton";
import { ClearActivitiesButton } from "@/components/layout/ClearActivitiesButton";

interface Props {
  initialName: string;
  initialHrMax: number | null;
  initialHrRest: number | null;
  initialLthrBpm: number | null;
  initialGarminEmail: string;
  initialGarminPassword: string;
  stravaConnected: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileClient({
  initialName,
  initialHrMax,
  initialHrRest,
  initialLthrBpm,
  initialGarminEmail,
  initialGarminPassword,
  stravaConnected,
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
    <div className="flex flex-col gap-10 pt-8">
      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-10 border-b border-gray-200 pb-10">
        {/* Name section */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-sm font-semibold text-foreground">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        {/* Heart rate profile section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Heart rate profile</h2>
            <p className="text-xs text-muted-foreground">
              Setting HR Max + HR Rest enables the Banister TRIMP model with exponential
              intensity weighting. Without them, the app falls back to the linear hrTSS model
              using LTHR. Saving will recalculate all existing activities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <HrField label="HR Max" unit="bpm" value={hrMax} onChange={setHrMax} placeholder="185" hint="Max heart rate" />
            <HrField label="HR Rest" unit="bpm" value={hrRest} onChange={setHrRest} placeholder="50" hint="Resting heart rate" />
            <HrField label="LTHR" unit="bpm" value={lthrBpm} onChange={setLthrBpm} placeholder="170" hint="Lactate threshold HR" />
          </div>

          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Active model: </span>
              {model}
            </p>
          </div>
        </div>

        {/* Garmin Connect Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Garmin Connect</h2>
            <p className="text-xs text-muted-foreground">
              Credentials are stored locally in the database and used only to sync activities
              from Garmin Connect.
            </p>
          </div>

          <div className="flex flex-col gap-4">
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

        {/* Form Submission */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving…" : "Save Changes"}
          </Button>
          {saveState === "saved" && (
            <p className="text-xs text-green-600">
              Saved.{recalcCount != null && recalcCount > 0
                ? ` Recalculated ${recalcCount} activit${recalcCount !== 1 ? "ies" : "y"}.`
                : ""}
            </p>
          )}
          {saveState === "error" && (
            <p className="text-xs text-destructive">Failed to save settings. Please try again.</p>
          )}
        </div>
      </form>

      {/* External Data Integrations Block */}
      <div className="flex flex-col gap-12 border-b border-gray-200 pb-10">
        
        {/* Garmin Sync Action Group */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Sync Garmin Connect</h2>
            <p className="text-xs text-muted-foreground">
              Directly interact with your Garmin Connect account to fetch new activities or re-process existing ones.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Activities</p>
              <GarminDownloadButton />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Maintenance</p>
              <GarminRecalcButton />
            </div>
          </div>
        </div>

        <Separator />

        {/* Strava Integration Action Group */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Strava Integration</h2>
            <p className="text-xs text-muted-foreground">
              {stravaConnected
                ? "Your account is linked. You can import your runs directly from Strava."
                : "Connect to your Strava account to automatically sync your training activities."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {stravaConnected ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  Connected to Strava
                </div>
                <StravaSyncButton />
              </div>
            ) : (
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/api/auth/strava/login">Connect with Strava</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
          <p className="text-xs text-muted-foreground">
            Irreversible actions for your profile data.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Delete all activities</p>
            <p className="text-xs text-muted-foreground">
              This will permanently remove all activities, laps, and sync history.
            </p>
          </div>
          <ClearActivitiesButton />
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-tight">
        {label} <span className="font-normal text-muted-foreground/60">({unit})</span>
      </Label>
      <Input
        id={id}
        type="number"
        min={30}
        max={250}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 px-3 py-1"
      />
      <p className="text-[10px] text-muted-foreground italic">{hint}</p>
    </div>
  );
}
