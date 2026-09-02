"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@prisma/client";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { useCanEdit } from "@/components/admin/AdminRoleContext";

type FormState = Omit<SiteSettings, "updatedAt">;

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-600">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
        />
      )}
    </div>
  );
}

export default function ContentForm({ settings }: { settings: SiteSettings }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage("Saved!");
      router.refresh();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-8">
    <fieldset disabled={!canEdit} className="contents">
      {!canEdit && (
        <p className="rounded-lg bg-stone-100 px-4 py-2 text-sm text-stone-600">
          Viewer accounts can see site content but can&apos;t change it.
        </p>
      )}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Brand</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Site name" value={form.siteName} onChange={(v) => set("siteName", v)} />
          <Field label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
        </div>
        <div className="mt-4">
          <ImageUploadField label="Logo" value={form.logoUrl} onChange={(v) => set("logoUrl", v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Hero Section</h2>
        <div className="mt-4 space-y-4">
          <Field label="Hero title" value={form.heroTitle} onChange={(v) => set("heroTitle", v)} />
          <Field label="Hero subtitle" value={form.heroSubtitle} onChange={(v) => set("heroSubtitle", v)} textarea />
          <ImageUploadField label="Hero image" value={form.heroImageUrl} onChange={(v) => set("heroImageUrl", v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">About Section</h2>
        <div className="mt-4 space-y-4">
          <Field label="About title" value={form.aboutTitle} onChange={(v) => set("aboutTitle", v)} />
          <Field label="About text" value={form.aboutText} onChange={(v) => set("aboutText", v)} textarea />
          <ImageUploadField label="About image" value={form.aboutImageUrl} onChange={(v) => set("aboutImageUrl", v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Donate &amp; Contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Contact number" value={form.contactNumber} onChange={(v) => set("contactNumber", v)} />
          <Field label="WhatsApp number (optional)" value={form.whatsappNumber} onChange={(v) => set("whatsappNumber", v)} />
          <Field label="Contact email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
          <Field label="Contact address" value={form.contactAddress} onChange={(v) => set("contactAddress", v)} />
        </div>
        <div className="mt-4">
          <Field label="Donate note (shown in the Donate popup)" value={form.donateNote} onChange={(v) => set("donateNote", v)} textarea />
        </div>
        <div className="mt-4">
          <ImageUploadField label="Donation QR code image" value={form.qrImageUrl} onChange={(v) => set("qrImageUrl", v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">Social Links</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Facebook URL" value={form.facebookUrl} onChange={(v) => set("facebookUrl", v)} />
          <Field label="Instagram URL" value={form.instagramUrl} onChange={(v) => set("instagramUrl", v)} />
          <Field label="Twitter URL" value={form.twitterUrl} onChange={(v) => set("twitterUrl", v)} />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {message && <span className="text-sm text-stone-600">{message}</span>}
      </div>
    </fieldset>
    </form>
  );
}
