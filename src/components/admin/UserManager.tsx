"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface UserRow {
  id: string;
  name: string | null;
  hrMax: number | null;
  hrRest: number | null;
  lthrBpm: number | null;
  garminEmail: string | null;
  activityCount: number;
}

interface UserManagerProps {
  users: UserRow[];
  activeUserId: string | null;
}

// ---------------------------------------------------------------------------
// Shared field
// ---------------------------------------------------------------------------

function Field({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        min={type === "number" ? 1 : undefined}
        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HR + Garmin fields (reused in both forms)
// ---------------------------------------------------------------------------

type ProfileForm = { hrMax: string; hrRest: string; lthrBpm: string; garminEmail: string; garminPassword: string };

function ProfileFields({
  form,
  onChange,
}: {
  form: ProfileForm;
  onChange: (field: keyof ProfileForm, value: string) => void;
}) {
  function f(key: keyof ProfileForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value);
  }
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Field label="HR Max (bpm)" type="number" value={form.hrMax} onChange={f("hrMax")} placeholder="e.g. 190" />
        <Field label="HR Rest (bpm)" type="number" value={form.hrRest} onChange={f("hrRest")} placeholder="e.g. 50" />
        <Field label="LTHR (bpm)" type="number" value={form.lthrBpm} onChange={f("lthrBpm")} placeholder="e.g. 165" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Garmin email" type="email" value={form.garminEmail} onChange={f("garminEmail")} placeholder="—" />
        <Field label="Garmin password" type="password" value={form.garminPassword} onChange={f("garminPassword")} placeholder="Leave blank to keep current" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Add user form
// ---------------------------------------------------------------------------

function AddUserForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", hrMax: "", hrRest: "", lthrBpm: "", garminEmail: "", garminPassword: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          hrMax: form.hrMax ? Number(form.hrMax) : null,
          hrRest: form.hrRest ? Number(form.hrRest) : null,
          lthrBpm: form.lthrBpm ? Number(form.lthrBpm) : null,
          garminEmail: form.garminEmail || null,
          garminPassword: form.garminPassword || null,
        }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Failed");
        return;
      }
      setForm({ name: "", hrMax: "", hrRest: "", lthrBpm: "", garminEmail: "", garminPassword: "" });
      setOpen(false);
      onCreated();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        + Add user
      </button>
    );
  }

  return (
    <Card>
      <CardContent>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">New user</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name *" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="e.g. João" required />
          <ProfileFields form={form} onChange={(field, value) => setForm((v) => ({ ...v, [field]: value }))} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
              {pending ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit user form
// ---------------------------------------------------------------------------

function EditUserForm({ user, onSaved, onCancel }: { user: UserRow; onSaved: () => void; onCancel: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: user.name ?? "",
    hrMax: user.hrMax?.toString() ?? "",
    hrRest: user.hrRest?.toString() ?? "",
    lthrBpm: user.lthrBpm?.toString() ?? "",
    garminEmail: user.garminEmail ?? "",
    garminPassword: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          hrMax: form.hrMax ? Number(form.hrMax) : null,
          hrRest: form.hrRest ? Number(form.hrRest) : null,
          lthrBpm: form.lthrBpm ? Number(form.lthrBpm) : null,
          garminEmail: form.garminEmail || null,
          ...(form.garminPassword && { garminPassword: form.garminPassword }),
        }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Failed to save");
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 pt-4 border-t border-gray-100">
      <Field label="Name *" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
      <ProfileFields form={form} onChange={(field, value) => setForm((v) => ({ ...v, [field]: value }))} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Garmin action buttons (download / recalculate)
// ---------------------------------------------------------------------------

type ActionState = "idle" | "pending" | "ok" | "error";

function GarminActions({ userId, hasCredentials }: { userId: string; hasCredentials: boolean }) {
  const router = useRouter();
  const [dlState, setDlState] = useState<ActionState>("idle");
  const [dlMsg, setDlMsg] = useState("");
  const [rcState, setRcState] = useState<ActionState>("idle");
  const [rcMsg, setRcMsg] = useState("");

  async function switchToUser() {
    await fetch("/api/admin/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  async function handleDownload() {
    setDlState("pending"); setDlMsg("");
    try {
      await switchToUser();
      const res = await fetch("/api/sync/garmin/download", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setDlState("error"); setDlMsg(j.error ?? "Failed"); return; }
      setDlState("ok");
      setDlMsg(`↓ ${j.downloaded} new · ${j.alreadyHave} existing`);
      router.refresh();
    } catch { setDlState("error"); setDlMsg("Network error"); }
  }

  async function handleRecalculate() {
    setRcState("pending"); setRcMsg("");
    try {
      await switchToUser();
      const res = await fetch("/api/sync/garmin/recalculate", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setRcState("error"); setRcMsg(j.error ?? "Failed"); return; }
      setRcState("ok");
      setRcMsg(`+${j.created} · ↺ ${j.updated}`);
      router.refresh();
    } catch { setRcState("error"); setRcMsg("Network error"); }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
      <button
        onClick={handleDownload}
        disabled={!hasCredentials || dlState === "pending"}
        title={!hasCredentials ? "Add Garmin credentials first" : "Fetch new activities from Garmin Connect"}
        className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {dlState === "pending" ? "Downloading…" : "↓ Download"}
      </button>
      <button
        onClick={handleRecalculate}
        disabled={rcState === "pending"}
        title="Reprocess saved .fit files with current HR profile"
        className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {rcState === "pending" ? "Recalculating…" : "↺ Recalculate"}
      </button>
      {dlMsg && (
        <span className={`text-xs ${dlState === "error" ? "text-red-500" : "text-green-600"}`}>
          {dlMsg}
        </span>
      )}
      {rcMsg && (
        <span className={`text-xs ${rcState === "error" ? "text-red-500" : "text-green-600"}`}>
          {rcMsg}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User card
// ---------------------------------------------------------------------------

function UserCard({ user, isActive, isOnly, onRefresh }: {
  user: UserRow; isActive: boolean; isOnly: boolean; onRefresh: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [switching, startSwitch] = useTransition();
  const [deleting, startDelete] = useTransition();

  function handleSwitch() {
    startSwitch(async () => {
      await fetch("/api/admin/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${user.name ?? "this user"}" and all their activities? Cannot be undone.`)) return;
    startDelete(async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert(((await res.json().catch(() => ({}))).error) ?? "Failed to delete");
        return;
      }
      onRefresh();
    });
  }

  const hrSummary = [
    user.hrMax   ? `max ${user.hrMax}`   : null,
    user.hrRest  ? `rest ${user.hrRest}` : null,
    user.lthrBpm ? `LTHR ${user.lthrBpm}` : null,
  ].filter(Boolean).join(" · ") || "—";

  return (
    <Card className={isActive ? "ring-2 ring-green-400 ring-offset-1" : ""}>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">
                {user.name ?? <span className="text-gray-400 font-normal italic">Unnamed</span>}
              </p>
              {isActive && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.activityCount} {user.activityCount === 1 ? "activity" : "activities"}
              {" · "}HR: {hrSummary}
              {" · "}Garmin:{" "}
              {user.garminEmail
                ? <span className="text-green-600">{user.garminEmail}</span>
                : <span className="text-gray-400">—</span>}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isActive && (
              <button onClick={handleSwitch} disabled={switching}
                className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
                {switching ? "…" : "Switch"}
              </button>
            )}
            <button onClick={() => setEditing((v) => !v)}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              {editing ? "Close" : "Edit"}
            </button>
            {!isOnly && (
              <button onClick={handleDelete} disabled={deleting}
                className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                {deleting ? "…" : "Delete"}
              </button>
            )}
          </div>
        </div>

        <GarminActions userId={user.id} hasCredentials={!!user.garminEmail} />

        {editing && (
          <EditUserForm
            user={user}
            onSaved={() => { setEditing(false); onRefresh(); }}
            onCancel={() => setEditing(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function UserManager({ users, activeUserId }: UserManagerProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddUserForm onCreated={() => router.refresh()} />
      </div>
      {users.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          isActive={u.id === activeUserId}
          isOnly={users.length === 1}
          onRefresh={() => router.refresh()}
        />
      ))}
    </div>
  );
}
