import { mkdir, writeFile, cp } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const isVercel = !!process.env.VERCEL;

// Vercel-demo shim: same reasoning as prisma.ts — /tmp is the only writable
// path in a deployed serverless function, so on Vercel we always use it here
// rather than relying on UPLOADS_DIR being configured correctly. Elsewhere
// (Docker, a plain Node server), UPLOADS_DIR stays configurable — Docker
// points it at the mounted volume (see docker-entrypoint.sh); local dev
// defaults to public/uploads.
export const UPLOAD_DIR = isVercel
  ? "/tmp/khidmat-demo-uploads"
  : process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

let demoUploadsReady: Promise<void> | null = null;

/** Copies the baked-in sample/placeholder images into UPLOAD_DIR on first use,
 * so the site doesn't show broken images before anyone's uploaded anything —
 * mirrors what docker-entrypoint.sh does for the Docker deployment. */
function ensureDemoUploadsReady(): Promise<void> {
  if (!isVercel) return Promise.resolve();
  if (!demoUploadsReady) {
    demoUploadsReady = (async () => {
      if (existsSync(UPLOAD_DIR)) return;
      await mkdir(UPLOAD_DIR, { recursive: true });
      const bakedInDir = path.join(process.cwd(), "public", "uploads");
      if (existsSync(bakedInDir)) {
        await cp(bakedInDir, UPLOAD_DIR, { recursive: true });
      }
    })();
  }
  return demoUploadsReady;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function saveUploadedImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Please upload a JPEG, PNG, WEBP, GIF, or SVG image.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large. Maximum size is 5MB.");
  }

  await ensureDemoUploadsReady();
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Served by src/app/api/uploads/[...path]/route.ts, not Next's public/ static
  // handler — next start does not reliably serve files added to public/ after
  // the server has started, which silently breaks admin-uploaded images in
  // production (verified: works in `next dev`, 404s in `next start`).
  return `/api/uploads/${filename}`;
}

export { ensureDemoUploadsReady };
