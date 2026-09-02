import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import UsersManager from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    redirect("/admin");
  }

  const users = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Users</h1>
      <p className="mt-1 text-sm text-stone-500">
        Manage who can access the admin panel. <strong>Admin</strong> accounts have full access;{" "}
        <strong>Viewer</strong> accounts can see everything but can&apos;t add, edit, or delete anything.
      </p>
      <UsersManager initialUsers={users} currentUserId={session.adminId} />
    </div>
  );
}
