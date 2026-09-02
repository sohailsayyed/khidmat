"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Counts = { causes: number; gallery: number; testimonials: number; donations: number; expenses: number };

export default function BackupManager({ counts }: { counts: Counts }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleExport() {
    setDownloading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khidmat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Export failed." });
    } finally {
      setDownloading(false);
    }
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage({ type: "error", text: "Choose a backup file first." });
      return;
    }

    const confirmed = confirm(
      "Restoring will REPLACE all current site content (hero/about text, contact & QR details, etc.), " +
        "causes, gallery photos, testimonials, donation records, and expense records with the contents " +
        "of this backup file. This cannot be undone. Continue?"
    );
    if (!confirmed) return;

    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed.");
      setMessage({
        type: "success",
        text: `Restored site content, ${data.counts.causes} causes, ${data.counts.gallery} gallery photos, ${data.counts.testimonials} testimonials, ${data.counts.donations} donations, and ${data.counts.expenses} expenses.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error && err.message
            ? err.message
            : "Restore failed. Make sure the file is a valid Khidmat backup.",
      });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Download backup</h2>
        <p className="mt-1 text-sm text-stone-500">
          Saves a single JSON file with your site content and donation records.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Site content</dt>
            <dd className="font-medium text-emerald-700">✓ Included</dd>
          </div>
          <div>
            <dt className="text-stone-500">Causes</dt>
            <dd className="font-medium text-stone-900">{counts.causes}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Gallery photos</dt>
            <dd className="font-medium text-stone-900">{counts.gallery}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Testimonials</dt>
            <dd className="font-medium text-stone-900">{counts.testimonials}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Donations</dt>
            <dd className="font-medium text-stone-900">{counts.donations}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Expenses</dt>
            <dd className="font-medium text-stone-900">{counts.expenses}</dd>
          </div>
        </dl>

        <button
          onClick={handleExport}
          disabled={downloading}
          className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download backup"}
        </button>

        <p className="mt-3 text-xs text-stone-400">
          This backs up your data — site text, contact/QR details, causes, gallery entries, testimonials,
          donation records, and expense records. It does not copy the uploaded image files themselves; back
          up the server&apos;s uploads folder separately to keep your photos too.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Restore from backup</h2>
        <p className="mt-1 text-sm text-stone-500">
          Choose a previously downloaded backup file. This <strong>replaces</strong> all current site
          content (hero/about text, contact number, QR code, etc.), causes, gallery entries, testimonials,
          donation records, and expense records with the contents of the file.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700"
        />

        <button
          onClick={handleImport}
          disabled={restoring}
          className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {restoring ? "Restoring…" : "Restore from backup"}
        </button>

        {message && (
          <p className={`mt-4 text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
