import { db } from "@/lib/db";
import { users, activities } from "@/lib/db/schema";
import { Header } from "@/components/layout/Header";
import { UserManager } from "@/components/admin/UserManager";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AdminPage() {
  const [activeUser, allUsers, allActivities] = await Promise.all([
    getCurrentUser(),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        hrMax: users.hrMax,
        hrRest: users.hrRest,
        lthrBpm: users.lthrBpm,
        garminEmail: users.garminEmail,
        createdAt: users.createdAt,
      })
      .from(users)
      .all(),
    db.select({ userId: activities.userId }).from(activities).all(),
  ]);

  const countByUser = new Map<string, number>();
  for (const a of allActivities) {
    countByUser.set(a.userId, (countByUser.get(a.userId) ?? 0) + 1);
  }

  const usersWithCount = allUsers.map((u) => ({
    ...u,
    activityCount: countByUser.get(u.id) ?? 0,
  }));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Users
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage users and switch the active profile for this session.
            </p>
          </div>
          <UserManager users={usersWithCount} activeUserId={activeUser?.id ?? null} />
        </div>
      </main>
    </>
  );
}
