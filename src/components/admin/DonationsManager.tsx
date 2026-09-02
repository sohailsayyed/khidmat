"use client";

import { useMemo, useRef, useState } from "react";
import type { Donation } from "@prisma/client";
import { computeDateBounds } from "@/lib/dateRange";
import DateRangeFilter, { type DateRangeValue } from "@/components/admin/DateRangeFilter";
import { mapCsvRows, parseCsv, type ParsedImportRow } from "@/lib/csv";
import { useCanEdit } from "@/components/admin/AdminRoleContext";

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function makeEmptyForm() {
  return { donorName: "", donorPhone: "", donorEmail: "", amount: "", method: "", note: "", donatedAt: todayLocalDate() };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

// Donations created/updated via the API come back as JSON, where createdAt is a
// string rather than the Date instance the server-rendered initial list has.
// new Date(...) normalizes either shape safely.
function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-IN");
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-stone-100 text-stone-500",
};

export default function DonationsManager({ initialDonations }: { initialDonations: Donation[] }) {
  const canEdit = useCanEdit();
  const [donations, setDonations] = useState(initialDonations);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({ range: "all", date: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(makeEmptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ParsedImportRow[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const dateBounds = useMemo(
    () => computeDateBounds(dateFilter.range, dateFilter.date),
    [dateFilter]
  );

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      if (sourceFilter !== "ALL" && d.source !== sourceFilter) return false;
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (dateBounds) {
        const createdAt = new Date(d.createdAt);
        if (createdAt < dateBounds.gte || createdAt >= dateBounds.lt) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${d.donorName} ${d.donorPhone} ${d.donorEmail}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [donations, search, sourceFilter, statusFilter, dateBounds]);

  const totals = useMemo(() => {
    const confirmed = filtered.filter((d) => d.status === "CONFIRMED").reduce((s, d) => s + d.amount, 0);
    const pending = filtered.filter((d) => d.status === "PENDING").reduce((s, d) => s + d.amount, 0);
    return { confirmed, pending, count: filtered.length };
  }, [filtered]);

  function startEdit(donation: Donation) {
    setEditingId(donation.id);
    setForm({
      donorName: donation.donorName,
      donorPhone: donation.donorPhone,
      donorEmail: donation.donorEmail,
      amount: String(donation.amount),
      method: donation.method,
      note: donation.note,
      donatedAt: new Date(donation.createdAt).toISOString().slice(0, 10),
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

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!form.donorName.trim()) {
      setError("Donor name is required.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/donations/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount }),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error);
        setDonations((d) => d.map((x) => (x.id === editingId ? updated : x)));
      } else {
        const res = await fetch("/api/admin/donations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount }),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error);
        setDonations((d) => [created, ...d]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/donations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    if (res.ok) setDonations((d) => d.map((x) => (x.id === id ? updated : x)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this donation record?")) return;
    const res = await fetch(`/api/admin/donations/${id}`, { method: "DELETE" });
    if (res.ok) setDonations((d) => d.filter((x) => x.id !== id));
  }

  function exportCsv() {
    const header = ["Donor", "Phone", "Email", "Amount", "Source", "Status", "Method", "Note", "Added By", "Date"];
    const rows = filtered.map((d) => [
      d.donorName,
      d.donorPhone,
      d.donorEmail,
      String(d.amount),
      d.source,
      d.status,
      d.method,
      d.note,
      d.createdBy,
      d.createdAt.toString(),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khidmat-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadImportTemplate() {
    const header = ["Donor", "Phone", "Email", "Amount", "Date", "Method", "Note"];
    const sample = ["Asha Patil", "9876543210", "", "500", "15/03/2025", "Cash", "Ramzan drive"];
    const csv = [header, sample]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khidmat-donations-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    setImportFileName(file.name);
    const text = await file.text();
    const rows = mapCsvRows(parseCsv(text));
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
      const res = await fetch("/api/admin/donations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");

      const refreshed = await fetch("/api/admin/donations");
      if (refreshed.ok) setDonations(await refreshed.json());

      setImportMessage({ type: "success", text: `Imported ${data.count} donation record${data.count === 1 ? "" : "s"}.` });
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
          <p className="text-xs font-medium uppercase text-stone-500">Confirmed (filtered)</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{formatCurrency(totals.confirmed)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-stone-500">Pending (filtered)</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{formatCurrency(totals.pending)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-stone-500">Records</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{totals.count}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search donor, phone, email…"
          className="w-64 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All sources</option>
          <option value="WEBSITE">Website</option>
          <option value="MANUAL">Manual</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        <button onClick={exportCsv} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
          Export CSV
        </button>
        {canEdit && (
          <label className="cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
            Import CSV
            <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
          </label>
        )}
        {canEdit && (
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="ml-auto rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {showForm ? "Close" : "+ Add manual donation"}
          </button>
        )}
      </div>

      {canEdit && importMessage && !importPreview && (
        <p className={`mt-3 text-sm ${importMessage.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
          {importMessage.text}
        </p>
      )}

      {canEdit && importPreview && (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
          {(() => {
            const validRows = importPreview.filter((r) => r.row);
            const errorRows = importPreview.filter((r) => !r.row);
            const totalAmount = validRows.reduce((s, r) => s + (r.row?.amount ?? 0), 0);
            return (
              <>
                <h2 className="text-sm font-semibold text-stone-900">Preview: {importFileName}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Ready to import <strong>{validRows.length}</strong> donation{validRows.length === 1 ? "" : "s"} totaling{" "}
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
                    {importing ? "Importing…" : `Import ${validRows.length} donation${validRows.length === 1 ? "" : "s"}`}
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

      {canEdit && !importPreview && (
        <p className="mt-2 text-xs text-stone-400">
          CSV needs a Donor and Amount column (Phone, Email, Date, Method, Note, Source, Status are optional).{" "}
          <button type="button" onClick={downloadImportTemplate} className="text-teal-700 hover:underline">
            Download a template
          </button>
          .
        </p>
      )}

      {canEdit && showForm && (
        <form onSubmit={handleSubmitForm} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-3">
          <h2 className="col-span-full text-sm font-semibold text-stone-900">
            {editingId ? "Edit donation" : "Add manual donation"}
          </h2>
          <div>
            <label className="text-xs font-medium text-stone-600">Donor name</label>
            <input
              value={form.donorName}
              onChange={(e) => setForm({ ...form, donorName: e.target.value })}
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
            <label className="text-xs font-medium text-stone-600">Donation date</label>
            <input
              type="date"
              value={form.donatedAt}
              onChange={(e) => setForm({ ...form, donatedAt: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Phone</label>
            <input
              value={form.donorPhone}
              onChange={(e) => setForm({ ...form, donorPhone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Email</label>
            <input
              value={form.donorEmail}
              onChange={(e) => setForm({ ...form, donorEmail: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Method</label>
            <input
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              placeholder="Cash, UPI, Bank transfer…"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Note</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Update donation" : "Add donation"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-stone-500 hover:underline">
                Cancel
              </button>
            )}
            {!editingId && <p className="text-xs text-stone-400">Manual entries are recorded as Confirmed by default.</p>}
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-3">Donor</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Added by</th>
              <th className="px-4 py-3">Date</th>
              {canEdit && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">{d.donorName}</td>
                <td className="px-4 py-3 text-stone-500">
                  {d.donorPhone}
                  {d.donorPhone && d.donorEmail ? " · " : ""}
                  {d.donorEmail}
                </td>
                <td className="px-4 py-3 font-medium">{formatCurrency(d.amount)}</td>
                <td className="px-4 py-3">{d.source}</td>
                <td className="px-4 py-3 text-stone-500">{d.method || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500">{d.createdBy || "—"}</td>
                <td className="px-4 py-3 text-stone-500">{formatDate(d.createdAt)}</td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => startEdit(d)} className="text-teal-700 hover:underline">
                        Edit
                      </button>
                      {d.status !== "CONFIRMED" && (
                        <button onClick={() => updateStatus(d.id, "CONFIRMED")} className="text-emerald-700 hover:underline">
                          Confirm
                        </button>
                      )}
                      {d.status !== "CANCELLED" && (
                        <button onClick={() => updateStatus(d.id, "CANCELLED")} className="text-stone-500 hover:underline">
                          Cancel
                        </button>
                      )}
                      {d.status !== "PENDING" && (
                        <button onClick={() => updateStatus(d.id, "PENDING")} className="text-amber-700 hover:underline">
                          Pending
                        </button>
                      )}
                      <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 9 : 8} className="px-4 py-8 text-center text-stone-400">
                  No donations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
