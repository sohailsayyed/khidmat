import { prisma } from "@/lib/prisma";
import GalleryManager from "@/components/admin/GalleryManager";

export default async function AdminGalleryPage() {
  const images = await prisma.galleryImage.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Gallery</h1>
      <p className="mt-1 text-sm text-stone-500">Upload photos to show in the homepage gallery.</p>
      <GalleryManager initialImages={images} />
    </div>
  );
}
