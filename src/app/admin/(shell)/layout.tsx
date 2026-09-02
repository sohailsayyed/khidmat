import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/admin/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/content", label: "Site Content" },
  { href: "/admin/causes", label: "Causes" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/expenses", label: "Amount Spent" },
  { href: "/admin/backup", label: "Backup & Restore" },
];

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="w-60 shrink-0 border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-5">
          <p className="text-lg font-semibold text-stone-900">Khidmat</p>
          <p className="text-xs text-stone-500">Admin Panel</p>
        </div>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-teal-50 hover:text-teal-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-3">
          <Link
            href="/"
            target="_blank"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            View site ↗
          </Link>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
          <span className="text-sm text-stone-500">{session?.email}</span>
          <div className="flex items-center gap-4">
            <Link href="/admin/account" className="text-sm font-medium text-teal-700 hover:underline">
              Change password
            </Link>
            <LogoutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
