import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import { AdminRoleProvider } from "@/components/admin/AdminRoleContext";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/content", label: "Site Content" },
  { href: "/admin/causes", label: "Causes" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/expenses", label: "Amount Spent" },
  { href: "/admin/backup", label: "Backup & Restore", adminOnly: true },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const role = session?.role ?? "ADMIN";
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");

  return (
    <AdminRoleProvider role={role}>
      <AdminShell navItems={navItems} email={session?.email} role={role}>
        {children}
      </AdminShell>
    </AdminRoleProvider>
  );
}
