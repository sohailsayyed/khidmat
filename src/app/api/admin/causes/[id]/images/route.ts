import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: causeId } = await params;
  const body = await req.json().catch(() => null);
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  try {
    const image = await prisma.causeImage.create({
      data: {
        causeId,
        imageUrl,
        order: typeof body?.order === "number" ? body.order : 0,
      },
    });
    return NextResponse.json(image, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Cause not found." }, { status: 404 });
  }
}
