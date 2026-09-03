import type { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { MIGRATIONS } from "./migrationsBundle";
import { seedDatabase } from "./seedDatabase";

/** Strips `-- comment` lines, then splits on `;` into individual runnable statements. */
function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Vercel-demo-only shim: Vercel's deployed filesystem is read-only except
 * `/tmp`, which is wiped on every cold start, and there's no long-running
 * process to run `prisma migrate deploy` at boot the way Docker's
 * docker-entrypoint.sh does. So on first use of a fresh /tmp SQLite file, we
 * apply the bundled migrations and seed data ourselves, right here.
 *
 * This means data on Vercel resets on cold starts — genuinely fine for a
 * quick demo, not for real use. See DOCKER-SETUP.md for a deployment where
 * data actually persists.
 */
export async function ensureDemoDatabase(prisma: PrismaClient, dbPath: string): Promise<void> {
  if (fs.existsSync(dbPath)) return;

  await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });

  console.log(`[demo-db] No database at ${dbPath} yet — initializing...`);
  for (const migration of MIGRATIONS) {
    for (const statement of splitStatements(migration.sql)) {
      await prisma.$executeRawUnsafe(statement);
    }
  }
  await seedDatabase(prisma);
  console.log("[demo-db] Ready.");
}
