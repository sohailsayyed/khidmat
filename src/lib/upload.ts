import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

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
