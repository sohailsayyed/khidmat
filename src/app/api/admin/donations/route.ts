import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where: Prisma.DonationWhereInput = {};
  if (source === "WEBSITE" || source === "MANUAL") where.source = source;
  if (status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED") where.status = status;
  if (q) {
    where.OR = [
      { donorName: { contains: q } },
      { donorPhone: { contains: q } },
      { donorEmail: { contains: q } },
    ];
  }

  const donations = await prisma.donation.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(donations);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const donorName = typeof body?.donorName === "string" ? body.donorName.trim() : "";
  const amount = Number(body?.amount);

  if (!donorName) {
    return NextResponse.json({ error: "Donor name is required." }, { status: 400 });
  }
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
  }

  let donatedAt: Date | undefined;
  if (typeof body?.donatedAt === "string" && body.donatedAt) {
    const parsed = new Date(`${body.donatedAt}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) donatedAt = parsed;
  }

  const donation = await prisma.donation.create({
    data: {
      donorName,
      donorPhone: typeof body?.donorPhone === "string" ? body.donorPhone : "",
      donorEmail: typeof body?.donorEmail === "string" ? body.donorEmail : "",
      amount,
      method: typeof body?.method === "string" ? body.method : "",
      note: typeof body?.note === "string" ? body.note : "",
      source: "MANUAL",
      status: "CONFIRMED",
      ...(donatedAt ? { createdAt: donatedAt } : {}),
    },
  });

  return NextResponse.json(donation, { status: 201 });
}
