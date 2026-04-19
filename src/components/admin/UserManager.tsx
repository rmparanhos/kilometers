"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
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
// Add user form
// ---------------------------------------------------------------------------

function AddUserForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    hrMax: "", hrRest: "", lthrBpm: "",
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          email: form.email,
          password: form.password,
          hrMax: form.hrMax ? Number(form.hrMax) : null,
          hrRest: form.hrRest ? Number(form.hrRest) : null,
          lthrBpm: form.lthrBpm ? Number(form.lthrBpm) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to create user");
        return;
      }
      setForm({ name: "", email: "", password: "", hrMax: "", hrRest: "", lthrBpm: "" });
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={form.name} onChange={field("name")} placeholder="Optional" />
            <Field label="Email *" type="email" value={form.email} onChange={field("email")} placeholder="user@example.com" required />
          </div>
          <Field label="Password *" type="password" value={form.password} onChange={field("password")} placeholder="Min 8 characters" required />
          <div className="grid grid-cols-3 gap-3">
            <Field label="HR Max (bpm)" type="number" value={form.hrMax} onChange={field("hrMax")} placeholder="e.g. 190" />
            <Field label="HR Rest (bpm)" type="number" value={form.hrRest} onChange={field("hrRest")} placeholder="e.g. 50" />
            <Field label="LTHR (bpm)" type="number" value={form.lthrBpm} onChange={field("lthrBpm")} placeholder="e.g. 165" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit user form (inline)
// ---------------------------------------------------------------------------

function EditUserForm({ user, onSaved, onCancel }: { user: UserRow; onSaved: () => void; onCancel: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: user.name ?? "",
    email: user.email,
    password: "",
    hrMax: user.hrMax?.toString() ?? "",
    hrRest: user.hrRest?.toString() ?? "",
    lthrBpm: user.lthrBpm?.toString() ?? "",
    garminEmail: user.garminEmail ?? "",
    garminPassword: "",
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          email: form.email,
          ...(form.password && { password: form.password }),
          hrMax: form.hrMax ? Number(form.hrMax) : null,
          hrRest: form.hrRest ? Number(form.hrRest) : null,
          lthrBpm: form.lthrBpm ? Number(form.lthrBpm) : null,
          garminEmail: form.garminEmail || null,
          ...(form.garminPassword && { garminPassword: form.garminPassword }),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to save");
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 pt-4 border-t border-gray-100">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" value={form.name} onChange={field("name")} placeholder="Optional" />
        <Field label="Email *" type="email" value={form.email} onChange={field("email")} required />
      </div>
      <Field label="New password" type="password" value={form.password} onChange={field("password")} placeholder="Leave blank to keep current" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="HR Max (bpm)" type="number" value={form.hrMax} onChange={field("hrMax")} placeholder="—" />
        <Field label="HR Rest (bpm)" type="number" value={form.hrRest} onChange={field("hrRest")} placeholder="—" />
        <Field label="LTHR (bpm)" type="number" value={form.lthrBpm} onChange={field("lthrBpm")} placeholder="—" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Garmin email" type="email" value={form.garminEmail} onChange={field("garminEmail")} placeholder="—" />
        <Field label="Garmin password" type="password" value={form.garminPassword} onChange={field("garminPassword")} placeholder="Leave blank to keep current" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// User card
// ---------------------------------------------------------------------------

function UserCard({
  user,
  isActive,
  isOnly,
  onRefresh,
}: {
  user: UserRow;
  isActive: boolean;
  isOnly: boolean;
  onRefresh: () => void;
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
    if (!confirm(`Delete ${user.name ?? user.email} and all their activities? This cannot be undone.`)) return;
    startDelete(async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Failed to delete user");
        return;
      }
      onRefresh();
    });
  }

  const hrSummary = [
    user.hrMax ? `max ${user.hrMax}` : null,
    user.hrRest ? `rest ${user.hrRest}` : null,
    user.lthrBpm ? `LTHR ${user.lthrBpm}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "—";

  return (
    <Card className={isActive ? "ring-2 ring-green-400 ring-offset-1" : ""}>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.name ?? <span className="text-gray-400 font-normal">Unnamed</span>}
              </p>
              {isActive && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isActive && (
              <button
                onClick={handleSwitch}
                disabled={switching}
                className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {switching ? "…" : "Switch"}
              </button>
            )}
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {editing ? "Close" : "Edit"}
            </button>
            {!isOnly && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? "…" : "Delete"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>
            <span className="font-medium text-gray-700">{user.activityCount}</span>{" "}
            {user.activityCount === 1 ? "activity" : "activities"}
          </span>
          <span>HR: {hrSummary}</span>
          <span>Garmin: {user.garminEmail ? <span className="text-green-600">{user.garminEmail}</span> : "—"}</span>
        </div>

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
// Root component
// ---------------------------------------------------------------------------

export function UserManager({ users: initialUsers, activeUserId }: UserManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddUserForm
          onCreated={() => {
            refresh();
            // Optimistically re-fetch won't update local state; rely on router.refresh()
          }}
        />
      </div>

      {users.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          isActive={u.id === activeUserId}
          isOnly={users.length === 1}
          onRefresh={refresh}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny helper
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={type === "number" ? 1 : undefined}
        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
      />
    </div>
  );
}
