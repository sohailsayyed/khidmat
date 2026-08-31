import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(testimonials);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!name || !message) {
    return NextResponse.json({ error: "Name and message are required." }, { status: 400 });
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      name,
      message,
      role: typeof body?.role === "string" ? body.role : "",
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl : "",
      order: typeof body?.order === "number" ? body.order : 0,
    },
  });

  return NextResponse.json(testimonial, { status: 201 });
}
