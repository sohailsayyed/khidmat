import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });
  return NextResponse.json(settings);
}

const EDITABLE_FIELDS = [
  "siteName",
  "tagline",
  "heroTitle",
  "heroSubtitle",
  "heroImageUrl",
  "logoUrl",
  "aboutTitle",
  "aboutText",
  "aboutImageUrl",
  "contactNumber",
  "contactEmail",
  "contactAddress",
  "qrImageUrl",
  "donateNote",
  "facebookUrl",
  "instagramUrl",
  "twitterUrl",
  "whatsappNumber",
] as const;

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === "string") {
      data[field] = body[field];
    }
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });

  return NextResponse.json(settings);
}
