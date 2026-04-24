import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function Header() {
  const [user, allUsers] = await Promise.all([
    getCurrentUser(),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).all(),
  ]);

  const multiUser = allUsers.length > 1;
  const displayName = user?.name ?? user?.email ?? "—";

  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-green-400 hover:text-green-300 transition-colors tracking-tight"
          >
            Kilometer
          </Link>
          <Link
            href="/activities"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Activities
          </Link>
          <Link
            href="/records"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Records
          </Link>
          <Link
            href="/equipment"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Equipment
          </Link>
          <Link
            href="/profile"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/docs"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/admin"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Users
          </Link>
        </nav>

        {multiUser && (
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="size-1.5 rounded-full bg-green-400 inline-block" />
            {displayName}
          </Link>
        )}
      </div>
    </header>
  );
}
