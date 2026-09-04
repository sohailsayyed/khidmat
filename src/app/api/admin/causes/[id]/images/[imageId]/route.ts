import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: causeId, imageId } = await params;
  const result = await prisma.causeImage.deleteMany({ where: { id: imageId, causeId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
