import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** True if removing/demoting this account would leave zero ADMIN accounts. */
async function wouldRemoveLastAdmin(excludeId: string) {
  const remaining = await prisma.admin.count({ where: { role: "ADMIN", id: { not: excludeId } } });
  return remaining === 0;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const data: { role?: "ADMIN" | "VIEWER"; passwordHash?: string } = {};

  if (body.role === "ADMIN" || body.role === "VIEWER") {
    if (body.role === "VIEWER" && target.role === "ADMIN" && (await wouldRemoveLastAdmin(id))) {
      return NextResponse.json({ error: "At least one admin account must remain." }, { status: 400 });
    }
    data.role = body.role;
  }

  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  const updated = await prisma.admin.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  if (auth.session.adminId === id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (target.role === "ADMIN" && (await wouldRemoveLastAdmin(id))) {
    return NextResponse.json({ error: "At least one admin account must remain." }, { status: 400 });
  }

  await prisma.admin.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
