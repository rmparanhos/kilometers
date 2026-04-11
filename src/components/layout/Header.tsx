import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const session = await getServerSession(authOptions);

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
            Atividades
          </Link>
          <Link
            href="/equipment"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Equipamentos
          </Link>
        </nav>

        {session?.user && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        )}
      </div>
    </header>
  );
}
