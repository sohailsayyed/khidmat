import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Idempotent — safe to call repeatedly. Creates the first admin account and
 * default content only if they don't already exist. Shared by the CLI seed
 * script (prisma/seed.ts) and the Vercel-demo lazy database init. */
export async function seedDatabase(prisma: PrismaClient) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@khidmat.org";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME || "Khidmat Admin";

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: { name: adminName, email: adminEmail, passwordHash },
    });
    console.log(`Created admin account: ${adminEmail}`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });

  const causeCount = await prisma.cause.count();
  if (causeCount === 0) {
    await prisma.cause.createMany({
      data: [
        {
          title: "Food for Families",
          description: "We provide monthly ration kits to families struggling to afford basic meals.",
          imageUrl: "/api/uploads/sample-cause-food.svg",
          order: 1,
        },
        {
          title: "Education Support",
          description: "Sponsoring school fees, books, and uniforms for underprivileged children.",
          imageUrl: "/api/uploads/sample-cause-education.svg",
          order: 2,
        },
        {
          title: "Healthcare Aid",
          description: "Free medical camps and financial assistance for urgent treatments.",
          imageUrl: "/api/uploads/sample-cause-health.svg",
          order: 3,
        },
      ],
    });
    console.log("Seeded default causes");
  }

  const galleryCount = await prisma.galleryImage.count();
  if (galleryCount === 0) {
    await prisma.galleryImage.createMany({
      data: [
        { imageUrl: "/api/uploads/sample-gallery-1.svg", caption: "Community gathering", order: 1 },
        { imageUrl: "/api/uploads/sample-gallery-2.svg", caption: "Donation drive", order: 2 },
        { imageUrl: "/api/uploads/sample-gallery-3.svg", caption: "Volunteers at work", order: 3 },
        { imageUrl: "/api/uploads/sample-gallery-4.svg", caption: "Education support", order: 4 },
        { imageUrl: "/api/uploads/sample-gallery-5.svg", caption: "Healthcare camp", order: 5 },
        { imageUrl: "/api/uploads/sample-gallery-6.svg", caption: "Food distribution", order: 6 },
      ],
    });
    console.log("Seeded default gallery images");
  }
}
