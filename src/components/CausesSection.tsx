import Image from "next/image";
import type { Cause } from "@prisma/client";

export default function CausesSection({ causes }: { causes: Cause[] }) {
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
            <div className="relative h-44 w-full bg-stone-100">
              <Image
                src={cause.imageUrl}
                alt={cause.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
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
