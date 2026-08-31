import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const donateSchema = z.object({
  donorName: z.string().trim().min(1).max(120),
  donorPhone: z.string().trim().max(30).optional().default(""),
  donorEmail: z.string().trim().email().max(160).optional().or(z.literal("")).default(""),
  amount: z.number().positive().max(10_000_000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = donateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid donation details." }, { status: 400 });
  }

  const donation = await prisma.donation.create({
    data: {
      donorName: parsed.data.donorName,
      donorPhone: parsed.data.donorPhone,
      donorEmail: parsed.data.donorEmail,
      amount: parsed.data.amount,
      source: "WEBSITE",
      status: "PENDING",
    },
  });

  return NextResponse.json({ id: donation.id }, { status: 201 });
}
