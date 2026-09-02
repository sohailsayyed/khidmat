import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const MAX_ROWS = 5000;

const importRowSchema = z.object({
  donorName: z.string().trim().min(1),
  donorPhone: z.string().trim().default(""),
  donorEmail: z.string().trim().default(""),
  amount: z.number().positive(),
  source: z.enum(["WEBSITE", "MANUAL"]).default("MANUAL"),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).default("CONFIRMED"),
  method: z.string().trim().default(""),
  note: z.string().trim().default(""),
  donatedAt: z.string().optional(),
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
    let createdAt: Date | undefined;
    if (r.donatedAt) {
      const d = new Date(`${r.donatedAt}T12:00:00`);
      if (!Number.isNaN(d.getTime())) createdAt = d;
    }
    return {
      donorName: r.donorName,
      donorPhone: r.donorPhone,
      donorEmail: r.donorEmail,
      amount: r.amount,
      source: r.source,
      status: r.status,
      method: r.method,
      note: r.note,
      createdBy: auth.session.name,
      ...(createdAt ? { createdAt } : {}),
    };
  });

  const result = await prisma.donation.createMany({ data });

  return NextResponse.json({ ok: true, count: result.count });
}
