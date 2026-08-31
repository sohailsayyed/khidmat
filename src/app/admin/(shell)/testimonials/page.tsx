import { prisma } from "@/lib/prisma";
import TestimonialsManager from "@/components/admin/TestimonialsManager";

export default async function AdminTestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Testimonials</h1>
      <p className="mt-1 text-sm text-stone-500">Manage quotes shown on the homepage.</p>
      <TestimonialsManager initialTestimonials={testimonials} />
    </div>
  );
}
