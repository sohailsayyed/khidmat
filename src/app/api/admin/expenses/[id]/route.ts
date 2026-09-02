import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const data: Record<string, string | number | Date> = {};
  if (typeof body.purpose === "string" && body.purpose.trim()) data.purpose = body.purpose.trim();
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.amount === "number" && body.amount > 0) data.amount = body.amount;
  if (typeof body.spentAt === "string" && body.spentAt) {
    const parsed = new Date(`${body.spentAt}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) data.spentAt = parsed;
  }

  try {
    const expense = await prisma.expense.update({ where: { id }, data });
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }
}
