import Link from "next/link";

export function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
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
        </nav>
      </div>
    </header>
  );
}
