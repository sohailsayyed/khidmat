"use client";

import { useState } from "react";
import Image from "next/image";
import type { Cause } from "@prisma/client";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useCanEdit } from "@/components/admin/AdminRoleContext";

const emptyForm = { title: "", description: "", imageUrl: "", raisedLabel: "", goalLabel: "" };

export default function CausesManager({ initialCauses }: { initialCauses: Cause[] }) {
  const canEdit = useCanEdit();
  const [causes, setCauses] = useState(initialCauses);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(cause: Cause) {
    setEditingId(cause.id);
    setForm({
      title: cause.title,
      description: cause.description,
      imageUrl: cause.imageUrl,
      raisedLabel: cause.raisedLabel,
      goalLabel: cause.goalLabel,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/causes/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error);
        setCauses((cs) => cs.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const res = await fetch("/api/admin/causes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, order: causes.length }),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error);
        setCauses((cs) => [...cs, created]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(cause: Cause) {
    const res = await fetch(`/api/admin/causes/${cause.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !cause.published }),
    });
    const updated = await res.json();
    if (res.ok) setCauses((cs) => cs.map((c) => (c.id === cause.id ? updated : c)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this cause?")) return;
    const res = await fetch(`/api/admin/causes/${id}`, { method: "DELETE" });
    if (res.ok) setCauses((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {causes.map((cause) => (
          <div key={cause.id} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
              <Image src={cause.imageUrl} alt={cause.title} fill sizes="64px" className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-stone-900">{cause.title}</p>
              <p className="text-sm text-stone-500 line-clamp-1">{cause.description}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                cause.published ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
              }`}
            >
              {cause.published ? "Published" : "Hidden"}
            </span>
            {canEdit && (
              <div className="flex gap-2 text-sm">
                <button onClick={() => togglePublished(cause)} className="text-stone-500 hover:text-teal-700">
                  {cause.published ? "Hide" : "Show"}
                </button>
                <button onClick={() => startEdit(cause)} className="text-teal-700 hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(cause.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        {causes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400">
            No causes yet. Add one using the form.
          </p>
        )}
      </div>

      {canEdit && (
      <form onSubmit={handleSubmit} className="h-fit space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">{editingId ? "Edit cause" : "Add a cause"}</h2>
        <div>
          <label className="text-xs font-medium text-stone-600">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600">Raised label</label>
            <input
              value={form.raisedLabel}
              onChange={(e) => setForm({ ...form, raisedLabel: e.target.value })}
              placeholder="₹50,000"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Goal label</label>
            <input
              value={form.goalLabel}
              onChange={(e) => setForm({ ...form, goalLabel: e.target.value })}
              placeholder="₹1,00,000 goal"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
        <ImageUploadField label="Image" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Update" : "Add cause"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-50">
              Cancel
            </button>
          )}
        </div>
      </form>
      )}
    </div>
  );
}
