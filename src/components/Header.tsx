import Link from "next/link";
import Image from "next/image";
import DonateButton from "@/components/DonateButton";
import type { SiteSettings } from "@prisma/client";

export default function Header({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          {settings.logoUrl ? (
            <Image
              src={settings.logoUrl}
              alt={settings.siteName}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
              {settings.siteName.slice(0, 1)}
            </span>
          )}
          <span className="text-lg font-semibold text-stone-900">{settings.siteName}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 sm:flex">
          <a href="#about" className="hover:text-teal-700">About</a>
          <a href="#causes" className="hover:text-teal-700">Causes</a>
          <a href="#gallery" className="hover:text-teal-700">Gallery</a>
          <a href="#contact" className="hover:text-teal-700">Contact</a>
        </nav>

        <DonateButton settings={settings} />
      </div>
    </header>
  );
}
