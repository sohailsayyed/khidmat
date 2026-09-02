"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryImage } from "@prisma/client";
import { useCanEdit } from "@/components/admin/AdminRoleContext";

export default function GalleryManager({ initialImages }: { initialImages: GalleryImage[] }) {
  const canEdit = useCanEdit();
  const [images, setImages] = useState(initialImages);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadData.url, caption, order: images.length }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error);
      setImages((imgs) => [...imgs, created]);
      setCaption("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this photo?")) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    if (res.ok) setImages((imgs) => imgs.filter((i) => i.id !== id));
  }

  return (
    <div className="mt-6">
      {canEdit && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-5">
          <div>
            <label className="text-xs font-medium text-stone-600">Caption (optional)</label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1 w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <label className="cursor-pointer rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {uploading ? "Uploading…" : "Upload photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100">
            <Image
              src={img.imageUrl}
              alt={img.caption || "Gallery photo"}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
            {canEdit && (
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                Delete
              </button>
            )}
            {img.caption && (
              <p className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-xs text-white">{img.caption}</p>
            )}
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400">
            No photos yet.
          </p>
        )}
      </div>
    </div>
  );
}
