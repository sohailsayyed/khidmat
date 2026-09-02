import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "khidmat_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  adminId: string;
  email: string;
  name: string;
  role: "ADMIN" | "VIEWER";
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * The JWT only proves *who* is asking (its signature can't be forged without
 * SESSION_SECRET) — it's never trusted for *what they're allowed to do*.
 * Role and name are always re-read from the database here, so a role change
 * (or account deletion) takes effect on this admin's very next request,
 * without waiting for their session to expire or for them to log out. This
 * runs in the Node.js runtime (Server Components, API routes), where Prisma
 * is available — unlike the edge-runtime proxy/middleware, which only checks
 * that the JWT is validly signed.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let adminId: string;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    adminId = payload.adminId as string;
  } catch {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!admin) return null; // account was deleted since this cookie was issued

  return { adminId: admin.id, email: admin.email, name: admin.name, role: admin.role };
}

/** For API routes that require full admin access. Returns the session on
 * success, or a ready-to-return NextResponse if the caller should be denied. */
export async function requireAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; status: 401 | 403; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, status: 401, error: "Not signed in." };
  if (session.role !== "ADMIN") return { ok: false, status: 403, error: "This action requires an admin account." };
  return { ok: true, session };
}

export { SESSION_COOKIE };
