import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

// Serves files from UPLOAD_DIR directly, instead of relying on Next's
// public/ static handler — see the comment in src/lib/upload.ts for why.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0 || segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, ...segments);
  const resolved = path.resolve(filePath);
  const resolvedUploadDir = path.resolve(UPLOAD_DIR);

  if (!resolved.startsWith(resolvedUploadDir + path.sep) && resolved !== resolvedUploadDir) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) throw new Error("not a file");

    const buffer = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
