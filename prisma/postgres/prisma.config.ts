// Config for the Vercel-only Postgres schema — kept separate from the root
// prisma.config.ts (which governs the SQLite schema used by Docker/local
// dev) so their migration histories never collide. Used via:
//   npx prisma <command> --config prisma/postgres/prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
    seed: "tsx ../seed.ts",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
