import { PrismaClient } from "@prisma/client";
import { ensureDemoDatabase } from "./ensureDemoDatabase";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaReadyPromise: Promise<void> | undefined;
};

// Vercel-demo shim: /tmp is the only writable path in a deployed serverless
// function, so on Vercel we always point here — regardless of whatever
// DATABASE_URL is set to — rather than relying on it being configured
// correctly. See ensureDemoDatabase.ts for what actually initializes it.
const DEMO_DB_PATH = "/tmp/khidmat-demo.db";
const isVercel = !!process.env.VERCEL;

const client =
  globalForPrisma.prisma ?? new PrismaClient(isVercel ? { datasources: { db: { url: `file:${DEMO_DB_PATH}` } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

/**
 * Wraps the client so every call (prisma.donation.findMany(...), $transaction,
 * etc.) awaits `ready` first — without changing how any caller uses `prisma`
 * elsewhere in the app. Two levels deep: PrismaClient's own methods
 * ($transaction, $executeRawUnsafe, ...), and each model delegate's methods
 * (prisma.donation.create, prisma.admin.findUnique, ...).
 */
function gateUntilReady(target: PrismaClient, ready: Promise<void>): PrismaClient {
  const wrapMethods = <T extends object>(obj: T): T =>
    new Proxy(obj, {
      get(inner, prop, receiver) {
        const value = Reflect.get(inner, prop, receiver);
        if (typeof value !== "function") return value;
        return async (...args: unknown[]) => {
          await ready;
          return (value as (...a: unknown[]) => unknown).apply(inner, args);
        };
      },
    });

  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value === "function") {
        return async (...args: unknown[]) => {
          await ready;
          return (value as (...a: unknown[]) => unknown).apply(obj, args);
        };
      }
      if (value && typeof value === "object") {
        return wrapMethods(value as object);
      }
      return value;
    },
  });
}

// Only Vercel needs the lazy init — Docker and a plain Node server already
// run migrations at startup (see docker-entrypoint.sh / `npm run start`), so
// the database is guaranteed ready before any request arrives there.
export const prisma: PrismaClient = isVercel
  ? gateUntilReady(
      client,
      globalForPrisma.prismaReadyPromise ?? (globalForPrisma.prismaReadyPromise = ensureDemoDatabase(client, DEMO_DB_PATH))
    )
  : client;
