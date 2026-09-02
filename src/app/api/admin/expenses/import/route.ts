import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const MAX_ROWS = 5000;

const importRowSchema = z.object({
  purpose: z.string().trim().min(1),
  amount: z.number().positive(),
  note: z.string().trim().default(""),
  spentAt: z.string().optional(),
});

const bodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(MAX_ROWS),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid import data. ${parsed.error.issues[0]?.message ?? ""}`.trim() },
      { status: 400 }
    );
  }

  const data = parsed.data.rows.map((r) => {
    let spentAt: Date | undefined;
    if (r.spentAt) {
      const d = new Date(`${r.spentAt}T12:00:00`);
      if (!Number.isNaN(d.getTime())) spentAt = d;
    }
    return {
      purpose: r.purpose,
      amount: r.amount,
      note: r.note,
      createdBy: auth.session.name,
      ...(spentAt ? { spentAt } : {}),
    };
  });

  const result = await prisma.expense.createMany({ data });

  return NextResponse.json({ ok: true, count: result.count });
}
