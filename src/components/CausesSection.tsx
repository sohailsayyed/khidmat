import type { Cause, CauseImage } from "@prisma/client";
import CauseCarousel from "@/components/CauseCarousel";

export default function CausesSection({ causes }: { causes: (Cause & { images: CauseImage[] })[] }) {
  if (causes.length === 0) return null;

  return (
    <section id="causes" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-stone-900">Our Causes</h2>
        <p className="mt-2 text-stone-600">Where your support makes the biggest difference.</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {causes.map((cause) => (
          <div
            key={cause.id}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <CauseCarousel images={[cause.imageUrl, ...cause.images.map((img) => img.imageUrl)]} alt={cause.title} />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-stone-900">{cause.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{cause.description}</p>
              {(cause.raisedLabel || cause.goalLabel) && (
                <p className="mt-3 text-xs font-medium text-teal-700">
                  {cause.raisedLabel}
                  {cause.raisedLabel && cause.goalLabel ? " of " : ""}
                  {cause.goalLabel}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
