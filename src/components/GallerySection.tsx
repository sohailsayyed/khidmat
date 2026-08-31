import Image from "next/image";
import type { GalleryImage } from "@prisma/client";

export default function GallerySection({ images }: { images: GalleryImage[] }) {
  if (images.length === 0) return null;

  return (
    <section id="gallery" className="bg-stone-50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-stone-900">Gallery</h2>
          <p className="mt-2 text-stone-600">Moments from our work in the community.</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-stone-200">
              <Image
                src={img.imageUrl}
                alt={img.caption || "Khidmat gallery photo"}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
