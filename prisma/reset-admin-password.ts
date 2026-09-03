// One-off utility: force-sets an admin's password, creating the account if
// it doesn't exist yet. Unlike prisma/seed.ts (which only creates an admin
// if none exists and never touches an existing one's password), this always
// applies the password you pass in. Useful when a login stops working and
// you're not sure whether the account already exists with a different
// password than you expect.
//
// Usage:
//   DATABASE_URL="<connection string>" \
//   ADMIN_EMAIL="admin@khidmat.org" \
//   ADMIN_PASSWORD="the-password-you-want" \
//   npx tsx prisma/reset-admin-password.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = process.env.ADMIN_NAME || "Khidmat Admin";

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { name, email, passwordHash },
  });

  console.log(`Password set for ${admin.email} (role: ${admin.role}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
