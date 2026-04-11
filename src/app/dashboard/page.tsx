import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Form chart and training load overview coming soon.
        </p>
      </div>
    </main>
  );
}
