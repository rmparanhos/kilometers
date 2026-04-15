import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Project Kilometer
          </Link>
          <Link
            href="/activities"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Activities
          </Link>
          <Link
            href="/equipment"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Equipment
          </Link>
          <Link
            href="/profile"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
