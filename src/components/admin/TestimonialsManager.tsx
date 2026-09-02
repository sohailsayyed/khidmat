"use client";

import { useState } from "react";
import type { Testimonial } from "@prisma/client";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useCanEdit } from "@/components/admin/AdminRoleContext";

const emptyForm = { name: "", role: "", message: "", imageUrl: "" };

export default function TestimonialsManager({ initialTestimonials }: { initialTestimonials: Testimonial[] }) {
  const canEdit = useCanEdit();
  const [items, setItems] = useState(initialTestimonials);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.message.trim()) {
      setError("Name and message are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, order: items.length }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error);
      setItems((i) => [...i, created]);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
    if (res.ok) setItems((i) => i.filter((t) => t.id !== id));
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-stone-900">{t.name}</p>
                {t.role && <p className="text-xs text-stone-500">{t.role}</p>}
                <p className="mt-2 text-sm text-stone-600">&ldquo;{t.message}&rdquo;</p>
              </div>
              {canEdit && (
                <button onClick={() => handleDelete(t.id)} className="shrink-0 text-sm text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400">
            No testimonials yet.
          </p>
        )}
      </div>

      {canEdit && (
      <form onSubmit={handleSubmit} className="h-fit space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Add testimonial</h2>
        <div>
          <label className="text-xs font-medium text-stone-600">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600">Role (optional)</label>
          <input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Donor, Volunteer, etc."
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <ImageUploadField label="Photo (optional)" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add testimonial"}
        </button>
      </form>
      )}
    </div>
  );
}
