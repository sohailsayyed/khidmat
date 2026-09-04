"use client";

import { useState } from "react";
import Image from "next/image";
import type { Cause, CauseImage } from "@prisma/client";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useCanEdit } from "@/components/admin/AdminRoleContext";

const emptyForm = { title: "", description: "", imageUrl: "", raisedLabel: "", goalLabel: "" };

type CauseWithImages = Cause & { images: CauseImage[] };

export default function CausesManager({ initialCauses }: { initialCauses: CauseWithImages[] }) {
  const canEdit = useCanEdit();
  const [causes, setCauses] = useState(initialCauses);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(cause: CauseWithImages) {
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

  async function handleAddImage(causeId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingFor(causeId);
    try {
      let nextOrder = causes.find((c) => c.id === causeId)?.images.length ?? 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

        const res = await fetch(`/api/admin/causes/${causeId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadData.url, order: nextOrder }),
        });
        const created = await res.json();
        if (!res.ok) throw new Error(created.error);
        nextOrder += 1;
        setCauses((cs) => cs.map((c) => (c.id === causeId ? { ...c, images: [...c.images, created] } : c)));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFor(null);
      e.target.value = "";
    }
  }

  async function handleDeleteImage(causeId: string, imageId: string) {
    const res = await fetch(`/api/admin/causes/${causeId}/images/${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setCauses((cs) =>
        cs.map((c) => (c.id === causeId ? { ...c, images: c.images.filter((img) => img.id !== imageId) } : c))
      );
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {causes.map((cause) => (
          <div key={cause.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-4">
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

            {(cause.images.length > 0 || canEdit) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                <span className="text-xs text-stone-400">Carousel photos:</span>
                {cause.images.map((img) => (
                  <div key={img.id} className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200">
                    <Image src={img.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    {canEdit && (
                      <button
                        aria-label="Remove photo"
                        onClick={() => handleDeleteImage(cause.id, img.id)}
                        className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-stone-300 text-lg text-stone-400 hover:border-teal-400 hover:text-teal-600">
                    {uploadingFor === cause.id ? "…" : "+"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddImage(cause.id, e)}
                      disabled={uploadingFor === cause.id}
                    />
                  </label>
                )}
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
