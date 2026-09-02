import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [siteSettings, causes, gallery, testimonials, donations, expenses] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "main" } }),
    prisma.cause.findMany({ orderBy: { order: "asc" } }),
    prisma.galleryImage.findMany({ orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
    prisma.donation.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.expense.findMany({ orderBy: { spentAt: "asc" } }),
  ]);

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    siteSettings,
    causes,
    gallery,
    testimonials,
    donations,
    expenses,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="khidmat-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

const causeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  raisedLabel: z.string().default(""),
  goalLabel: z.string().default(""),
  order: z.number().default(0),
  published: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const galleryImageSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().default(""),
  order: z.number().default(0),
  createdAt: z.string(),
});

const testimonialSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().default(""),
  message: z.string(),
  imageUrl: z.string().default(""),
  order: z.number().default(0),
  published: z.boolean().default(true),
  createdAt: z.string(),
});

const donationSchema = z.object({
  id: z.string(),
  donorName: z.string(),
  donorPhone: z.string().default(""),
  donorEmail: z.string().default(""),
  amount: z.number(),
  source: z.enum(["WEBSITE", "MANUAL"]),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
  method: z.string().default(""),
  note: z.string().default(""),
  createdBy: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const expenseSchema = z.object({
  id: z.string(),
  purpose: z.string(),
  amount: z.number(),
  note: z.string().default(""),
  createdBy: z.string().default(""),
  spentAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const siteSettingsSchema = z.object({
  id: z.string().default("main"),
  siteName: z.string(),
  tagline: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  heroImageUrl: z.string(),
  logoUrl: z.string(),
  aboutTitle: z.string(),
  aboutText: z.string(),
  aboutImageUrl: z.string(),
  contactNumber: z.string(),
  contactEmail: z.string(),
  contactAddress: z.string(),
  qrImageUrl: z.string(),
  donateNote: z.string(),
  facebookUrl: z.string(),
  instagramUrl: z.string(),
  twitterUrl: z.string(),
  whatsappNumber: z.string(),
  updatedAt: z.string(),
});

const backupSchema = z.object({
  version: z.number(),
  siteSettings: siteSettingsSchema.nullable().optional(),
  causes: z.array(causeSchema).default([]),
  gallery: z.array(galleryImageSchema).default([]),
  testimonials: z.array(testimonialSchema).default([]),
  donations: z.array(donationSchema).default([]),
  // Absent in backups made before Expenses existed (version 1) — defaults to
  // empty so those older files still restore cleanly.
  expenses: z.array(expenseSchema).default([]),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = backupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "This doesn't look like a valid Khidmat backup file." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Content, donation, and expense records only — admin login accounts are
    // never touched by a restore, so this can't lock anyone out.
    await tx.donation.deleteMany();
    await tx.expense.deleteMany();
    await tx.testimonial.deleteMany();
    await tx.galleryImage.deleteMany();
    await tx.cause.deleteMany();

    if (data.siteSettings) {
      const { updatedAt, ...rest } = data.siteSettings;
      await tx.siteSettings.upsert({
        where: { id: "main" },
        update: { ...rest, updatedAt: new Date(updatedAt) },
        create: { ...rest, id: "main", updatedAt: new Date(updatedAt) },
      });
    }

    for (const c of data.causes) {
      const { createdAt, updatedAt, ...rest } = c;
      await tx.cause.create({ data: { ...rest, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) } });
    }
    for (const g of data.gallery) {
      const { createdAt, ...rest } = g;
      await tx.galleryImage.create({ data: { ...rest, createdAt: new Date(createdAt) } });
    }
    for (const t of data.testimonials) {
      const { createdAt, ...rest } = t;
      await tx.testimonial.create({ data: { ...rest, createdAt: new Date(createdAt) } });
    }
    for (const d of data.donations) {
      const { createdAt, updatedAt, ...rest } = d;
      await tx.donation.create({ data: { ...rest, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) } });
    }
    for (const ex of data.expenses) {
      const { spentAt, createdAt, updatedAt, ...rest } = ex;
      await tx.expense.create({
        data: { ...rest, spentAt: new Date(spentAt), createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    counts: {
      causes: data.causes.length,
      gallery: data.gallery.length,
      testimonials: data.testimonials.length,
      donations: data.donations.length,
      expenses: data.expenses.length,
    },
  });
}
