import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const causes = await prisma.cause.findMany({
    orderBy: { order: "asc" },
    include: { images: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(causes);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }

  const cause = await prisma.cause.create({
    data: {
      title,
      description,
      imageUrl: typeof body?.imageUrl === "string" && body.imageUrl ? body.imageUrl : undefined,
      raisedLabel: typeof body?.raisedLabel === "string" ? body.raisedLabel : "",
      goalLabel: typeof body?.goalLabel === "string" ? body.goalLabel : "",
      order: typeof body?.order === "number" ? body.order : 0,
      published: typeof body?.published === "boolean" ? body.published : true,
    },
    include: { images: true },
  });

  return NextResponse.json(cause, { status: 201 });
}
