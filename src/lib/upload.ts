import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

// Configurable so Docker can point this at a mounted volume (e.g. /app/data/uploads)
// separate from the app's public/ folder. Defaults to public/uploads for local dev.
export const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function saveUploadedImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Please upload a JPEG, PNG, WEBP, GIF, or SVG image.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large. Maximum size is 5MB.");
  }

  const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

  // Vercel's filesystem is read-only at runtime — when Blob storage is
  // connected (Vercel dashboard → Storage → Blob), use that instead. Local
  // disk stays the default everywhere else (Docker, plain Node servers,
  // local dev), where it's already persistent.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, file, { access: "public" });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Served by src/app/api/uploads/[...path]/route.ts, not Next's public/ static
  // handler — next start does not reliably serve files added to public/ after
  // the server has started, which silently breaks admin-uploaded images in
  // production (verified: works in `next dev`, 404s in `next start`).
  return `/api/uploads/${filename}`;
}
