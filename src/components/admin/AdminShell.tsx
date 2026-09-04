"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/admin/LogoutButton";

type NavItem = { href: string; label: string };

const COLLAPSED_KEY = "khidmat-admin-sidebar-collapsed";

export default function AdminShell({
  navItems,
  email,
  role,
  children,
}: {
  navItems: NavItem[];
  email?: string;
  role: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Remembered per-browser so the choice sticks across page loads.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // ignore (private browsing, etc.) - just falls back to expanded
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-stone-200 bg-white transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:hidden" : ""}`}
      >
        <div className="border-b border-stone-200 px-5 py-5">
          <p className="text-lg font-semibold text-stone-900">Khidmat</p>
          <p className="text-xs text-stone-500">Admin Panel</p>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
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

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-lg border border-stone-200 p-1.5 text-stone-600 md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
              onClick={toggleCollapsed}
              className="hidden shrink-0 rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 md:inline-flex"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path strokeLinecap="round" d="M9 4v16" />
              </svg>
            </button>
            <span className="truncate text-sm text-stone-500">
              {email}
              {role === "VIEWER" && (
                <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                  Viewer
                </span>
              )}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link href="/admin/account" className="text-sm font-medium text-teal-700 hover:underline">
              Change password
            </Link>
            <LogoutButton />
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
