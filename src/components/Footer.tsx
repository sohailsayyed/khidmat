import type { SiteSettings } from "@prisma/client";

export default function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const socials = [
    { label: "Facebook", url: settings.facebookUrl },
    { label: "Instagram", url: settings.instagramUrl },
    { label: "Twitter", url: settings.twitterUrl },
  ].filter((s) => s.url);

  return (
    <footer id="contact" className="mt-auto border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{settings.siteName}</h3>
            <p className="mt-2 text-sm text-stone-600">{settings.tagline}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Contact</h4>
            <ul className="mt-2 space-y-1 text-sm text-stone-600">
              <li>
                <a href={`tel:${settings.contactNumber}`} className="hover:text-teal-700">
                  {settings.contactNumber}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-teal-700">
                  {settings.contactEmail}
                </a>
              </li>
              <li>{settings.contactAddress}</li>
            </ul>
          </div>
          {socials.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Follow us</h4>
              <ul className="mt-2 space-y-1 text-sm text-stone-600">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-teal-700">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="mt-10 text-center text-xs text-stone-400">
          © {year} {settings.siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
