import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { computeDateBounds, type DateRangeMode } from "@/lib/dateRange";
import DashboardDateFilter from "@/components/admin/DashboardDateFilter";
import type { Prisma } from "@prisma/client";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const VALID_MODES: DateRangeMode[] = ["all", "day", "month", "year"];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const params = await searchParams;
  const range: DateRangeMode = VALID_MODES.includes(params.range as DateRangeMode)
    ? (params.range as DateRangeMode)
    : "all";
  const bounds = computeDateBounds(range, params.date ?? "");

  const dateWhere: Prisma.DonationWhereInput = bounds ? { createdAt: { gte: bounds.gte, lt: bounds.lt } } : {};

  const [confirmedAgg, pendingAgg, websiteCount, manualCount, causeCount, recent] = await Promise.all([
    prisma.donation.aggregate({ where: { ...dateWhere, status: "CONFIRMED" }, _sum: { amount: true }, _count: true }),
    prisma.donation.aggregate({ where: { ...dateWhere, status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.donation.count({ where: { ...dateWhere, source: "WEBSITE" } }),
    prisma.donation.count({ where: { ...dateWhere, source: "MANUAL" } }),
    prisma.cause.count(),
    prisma.donation.findMany({ where: dateWhere, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const stats = [
    { label: "Total Confirmed", value: formatCurrency(confirmedAgg._sum.amount ?? 0), sub: `${confirmedAgg._count} donations` },
    { label: "Pending", value: formatCurrency(pendingAgg._sum.amount ?? 0), sub: `${pendingAgg._count} awaiting confirmation` },
    { label: "From Website", value: String(websiteCount), sub: "donation intents submitted" },
    { label: "Manual Entries", value: String(manualCount), sub: "recorded by admins" },
    { label: "Active Causes", value: String(causeCount), sub: "shown on site" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        <Suspense fallback={null}>
          <DashboardDateFilter />
        </Suspense>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold text-stone-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-stone-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-900">
          {range === "all" ? "Recent Donations" : "Donations in Selected Period"}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-4">Donor</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b border-stone-100">
                  <td className="py-2 pr-4">{d.donorName}</td>
                  <td className="py-2 pr-4">{formatCurrency(d.amount)}</td>
                  <td className="py-2 pr-4">{d.source}</td>
                  <td className="py-2 pr-4">{d.status}</td>
                  <td className="py-2 pr-4 text-stone-500">{d.createdAt.toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400">No donations in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
