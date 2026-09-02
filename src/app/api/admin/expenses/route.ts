import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const expenses = await prisma.expense.findMany({ orderBy: { spentAt: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "";
  const amount = Number(body?.amount);

  if (!purpose) {
    return NextResponse.json({ error: "Purpose is required." }, { status: 400 });
  }
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
  }

  let spentAt: Date | undefined;
  if (typeof body?.spentAt === "string" && body.spentAt) {
    const parsed = new Date(`${body.spentAt}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) spentAt = parsed;
  }

  const expense = await prisma.expense.create({
    data: {
      purpose,
      amount,
      note: typeof body?.note === "string" ? body.note : "",
      ...(spentAt ? { spentAt } : {}),
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
