import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DonateButton from "@/components/DonateButton";
import CausesSection from "@/components/CausesSection";
import GallerySection from "@/components/GallerySection";
import TestimonialsSection from "@/components/TestimonialsSection";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, causes, gallery, testimonials] = await Promise.all([
    getSiteSettings(),
    prisma.cause.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    prisma.galleryImage.findMany({ orderBy: { order: "asc" }, take: 8 }),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <Header settings={settings} />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src={settings.heroImageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col items-start px-4 py-28 sm:px-6 sm:py-36">
            <h1 className="max-w-2xl text-4xl font-bold text-white sm:text-5xl">
              {settings.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-100">{settings.heroSubtitle}</p>
            <DonateButton
              settings={settings}
              className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-semibold text-teal-800 shadow-lg transition hover:bg-stone-100"
            />
          </div>
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-stone-100 sm:h-96">
              <Image
                src={settings.aboutImageUrl}
                alt={settings.aboutTitle}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-stone-900">{settings.aboutTitle}</h2>
              <p className="mt-4 whitespace-pre-line text-stone-600">{settings.aboutText}</p>
            </div>
          </div>
        </section>

        <CausesSection causes={causes} />
        <GallerySection images={gallery} />
        <TestimonialsSection testimonials={testimonials} />

        <section className="bg-teal-800">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white">Every Contribution Counts</h2>
            <p className="mt-3 text-teal-100">{settings.donateNote}</p>
            <DonateButton
              settings={settings}
              className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-teal-800 shadow-lg transition hover:bg-stone-100"
            />
          </div>
        </section>
      </main>

      <Footer settings={settings} />
    </>
  );
}
