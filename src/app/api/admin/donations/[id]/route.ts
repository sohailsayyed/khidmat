import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const data: Record<string, string | number> = {};
  if (body.status === "PENDING" || body.status === "CONFIRMED" || body.status === "CANCELLED") {
    data.status = body.status;
  }
  if (typeof body.donorName === "string") data.donorName = body.donorName;
  if (typeof body.donorPhone === "string") data.donorPhone = body.donorPhone;
  if (typeof body.donorEmail === "string") data.donorEmail = body.donorEmail;
  if (typeof body.method === "string") data.method = body.method;
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.amount === "number" && body.amount > 0) data.amount = body.amount;

  try {
    const donation = await prisma.donation.update({ where: { id }, data });
    return NextResponse.json(donation);
  } catch {
    return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.donation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  }
}
