import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "khidmat_admin_session";

// Paths only an ADMIN role may touch, regardless of HTTP method — managing
// other accounts, and exporting/restoring the full data backup.
const ADMIN_ONLY_PREFIXES = ["/admin/users", "/api/admin/users", "/api/admin/backup"];

// Mutating requests a VIEWER is allowed to make even though they're
// otherwise read-only — logging out, and changing their own password.
const VIEWER_ALLOWED_MUTATIONS = new Set(["/api/admin/logout", "/api/admin/account/password"]);

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

function deny(request: NextRequest, reason: string) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: reason }, { status: 403 });
  }
  const url = new URL("/admin", request.url);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let role: "ADMIN" | "VIEWER" | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      // Sessions issued before roles existed won't have this claim — treat
      // as ADMIN rather than locking out the original account.
      role = (payload.role as "ADMIN" | "VIEWER" | undefined) ?? "ADMIN";
    } catch {
      role = null;
    }
  }

  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnlyPath = ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAdminOnlyPath && role !== "ADMIN") {
    return deny(request, "This area is only available to admin accounts.");
  }

  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (role === "VIEWER" && isMutation && pathname.startsWith("/api/admin") && !VIEWER_ALLOWED_MUTATIONS.has(pathname)) {
    return deny(request, "Viewer accounts have read-only access.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
