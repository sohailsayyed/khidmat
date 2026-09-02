"use client";

import { useMemo, useRef, useState } from "react";
import type { Expense } from "@prisma/client";
import { computeDateBounds } from "@/lib/dateRange";
import DateRangeFilter, { type DateRangeValue } from "@/components/admin/DateRangeFilter";
import { mapExpenseCsvRows, parseCsv, type ParsedExpenseImportRow } from "@/lib/csv";

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function makeEmptyForm() {
  return { purpose: "", amount: "", note: "", spentAt: todayLocalDate() };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

// Expenses created/updated via the API come back as JSON, where spentAt is a
// string rather than the Date instance the server-rendered initial list has.
function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-IN");
}

export default function ExpensesManager({
  initialExpenses,
  totalDonations,
}: {
  initialExpenses: Expense[];
  totalDonations: number;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({ range: "all", date: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ParsedExpenseImportRow[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const availableBalance = totalDonations - totalSpent;

  const dateBounds = useMemo(() => computeDateBounds(dateFilter.range, dateFilter.date), [dateFilter]);

  const filtered = useMemo(() => {
    if (!dateBounds) return expenses;
    return expenses.filter((e) => {
      const spentAt = new Date(e.spentAt);
      return spentAt >= dateBounds.gte && spentAt < dateBounds.lt;
    });
  }, [expenses, dateBounds]);

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setForm({
      purpose: expense.purpose,
      amount: String(expense.amount),
      note: expense.note,
      spentAt: new Date(expense.spentAt).toISOString().slice(0, 10),
    });
    setShowForm(true);
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(makeEmptyForm());
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!form.purpose.trim()) {
      setError("Purpose is required.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/expenses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount }),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error);
        setExpenses((exps) => exps.map((x) => (x.id === editingId ? updated : x)));
      } else {
        const res = await fetch("/api/admin/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount }),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error);
        setExpenses((exps) => [created, ...exps]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense record?")) return;
    const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (res.ok) setExpenses((exps) => exps.filter((x) => x.id !== id));
  }

  function exportCsv() {
    const header = ["Purpose", "Amount", "Note", "Date"];
    const rows = filtered.map((e) => [e.purpose, String(e.amount), e.note, e.spentAt.toString()]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khidmat-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadImportTemplate() {
    const header = ["Purpose", "Amount", "Date", "Note"];
    const sample = ["Ration kits", "3000", "15/03/2025", "Ramzan drive"];
    const csv = [header, sample]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khidmat-expenses-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    setImportFileName(file.name);
    const text = await file.text();
    const rows = mapExpenseCsvRows(parseCsv(text));
    setImportPreview(rows);
    e.target.value = "";
  }

  function cancelImport() {
    setImportPreview(null);
    setImportFileName("");
    setImportMessage(null);
  }

  async function confirmImport() {
    if (!importPreview) return;
    const validRows = importPreview.filter((r) => r.row).map((r) => r.row!);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetch("/api/admin/expenses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");

      const refreshed = await fetch("/api/admin/expenses");
      if (refreshed.ok) setExpenses(await refreshed.json());

      setImportMessage({ type: "success", text: `Imported ${data.count} expense record${data.count === 1 ? "" : "s"}.` });
      setImportPreview(null);
      setImportFileName("");
    } catch (err) {
      setImportMessage({ type: "error", text: err instanceof Error ? err.message : "Import failed." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-stone-500">Total Donations (Confirmed)</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{formatCurrency(totalDonations)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-stone-500">Total Spent</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs font-medium uppercase text-teal-700">Available Balance</p>
          <p className={`mt-1 text-xl font-semibold ${availableBalance < 0 ? "text-red-600" : "text-teal-800"}`}>
            {formatCurrency(availableBalance)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        <button onClick={exportCsv} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
          Export CSV
        </button>
        <label className="cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
          Import CSV
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
        </label>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="ml-auto rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          {showForm ? "Close" : "+ Add expense"}
        </button>
      </div>

      {importMessage && !importPreview && (
        <p className={`mt-3 text-sm ${importMessage.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
          {importMessage.text}
        </p>
      )}

      {importPreview && (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
          {(() => {
            const validRows = importPreview.filter((r) => r.row);
            const errorRows = importPreview.filter((r) => !r.row);
            const totalAmount = validRows.reduce((s, r) => s + (r.row?.amount ?? 0), 0);
            return (
              <>
                <h2 className="text-sm font-semibold text-stone-900">Preview: {importFileName}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Ready to import <strong>{validRows.length}</strong> expense{validRows.length === 1 ? "" : "s"} totaling{" "}
                  <strong>{formatCurrency(totalAmount)}</strong>.
                  {errorRows.length > 0 && (
                    <> {errorRows.length} row{errorRows.length === 1 ? "" : "s"} will be skipped.</>
                  )}
                </p>

                {errorRows.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
                    {errorRows.slice(0, 20).map((r) => (
                      <div key={r.index}>
                        Row {r.index}: {r.error}
                      </div>
                    ))}
                    {errorRows.length > 20 && <div>…and {errorRows.length - 20} more</div>}
                  </div>
                )}

                {importMessage && (
                  <p className={`mt-3 text-sm ${importMessage.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
                    {importMessage.text}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={confirmImport}
                    disabled={importing || validRows.length === 0}
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {importing ? "Importing…" : `Import ${validRows.length} expense${validRows.length === 1 ? "" : "s"}`}
                  </button>
                  <button
                    onClick={cancelImport}
                    disabled={importing}
                    className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {!importPreview && (
        <p className="mt-2 text-xs text-stone-400">
          CSV needs a Purpose and Amount column (Date, Note are optional).{" "}
          <button type="button" onClick={downloadImportTemplate} className="text-teal-700 hover:underline">
            Download a template
          </button>
          .
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-stone-600">Purpose</label>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="Ration kits, medical camp, etc."
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Amount (₹)</label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Date</label>
            <input
              type="date"
              value={form.spentAt}
              onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="col-span-full">
            <label className="text-xs font-medium text-stone-600">Note (optional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Update expense" : "Add expense"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-50">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">{e.purpose}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-stone-500">{e.note || "—"}</td>
                <td className="px-4 py-3 text-stone-500">{formatDate(e.spentAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => startEdit(e)} className="text-teal-700 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  No expenses match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
