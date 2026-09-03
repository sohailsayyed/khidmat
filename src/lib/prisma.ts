import { PrismaClient } from "@prisma/client";

// Supabase's pooled connection (used for DATABASE_URL on Vercel) runs in
// PgBouncer/Supavisor transaction-pooling mode, which doesn't support
// Prisma's default prepared-statement caching — a query can land on a
// different backend connection than the one that prepared it, causing
// "prepared statement ... does not exist" errors. `pgbouncer=true` tells
// Prisma to skip that caching. Applied here (not just documented) so it
// can't be missed by editing the env var by hand. No-op for the local
// SQLite `file:` URL.
function resolveDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres") || url.includes("pgbouncer=")) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}pgbouncer=true`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: resolveDatasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
