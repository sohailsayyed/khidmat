import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const images = await prisma.galleryImage.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  const image = await prisma.galleryImage.create({
    data: {
      imageUrl,
      caption: typeof body?.caption === "string" ? body.caption : "",
      order: typeof body?.order === "number" ? body.order : 0,
    },
  });

  return NextResponse.json(image, { status: 201 });
}
