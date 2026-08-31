import Image from "next/image";
import type { Testimonial } from "@prisma/client";

export default function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-stone-900">What People Say</h2>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-600 italic">&ldquo;{t.message}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              {t.imageUrl ? (
                <Image
                  src={t.imageUrl}
                  alt={t.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                  {t.name.slice(0, 1)}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-stone-900">{t.name}</p>
                {t.role && <p className="text-xs text-stone-500">{t.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
