import { prisma } from "@/lib/prisma";
import ExpensesManager from "@/components/admin/ExpensesManager";

export default async function AdminExpensesPage() {
  const [expenses, confirmedAgg] = await Promise.all([
    prisma.expense.findMany({ orderBy: { spentAt: "desc" } }),
    prisma.donation.aggregate({ where: { status: "CONFIRMED" }, _sum: { amount: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Amount Spent</h1>
      <p className="mt-1 text-sm text-stone-500">
        Track what the collected donations have been spent on, and see the remaining available balance.
      </p>
      <ExpensesManager initialExpenses={expenses} totalDonations={confirmedAgg._sum.amount ?? 0} />
    </div>
  );
}
