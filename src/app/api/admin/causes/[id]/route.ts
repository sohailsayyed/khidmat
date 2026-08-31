import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EDITABLE_FIELDS = [
  "title",
  "description",
  "imageUrl",
  "raisedLabel",
  "goalLabel",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const data: Record<string, string | number | boolean> = {};
  for (const field of EDITABLE_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  if (typeof body.order === "number") data.order = body.order;
  if (typeof body.published === "boolean") data.published = body.published;

  try {
    const cause = await prisma.cause.update({ where: { id }, data });
    return NextResponse.json(cause);
  } catch {
    return NextResponse.json({ error: "Cause not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.cause.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Cause not found." }, { status: 404 });
  }
}
