import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    // Uploaded logos/QR codes may be SVG; only admin-controlled uploads are served from /uploads.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Vercel Blob (used for uploads on Vercel — see VERCEL-SETUP.md) serves
    // files from a per-store subdomain of this host; next/image refuses to
    // load any external hostname that isn't explicitly allow-listed here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
