import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "concertium_session";

// Public paths that do not require authentication.
// /share/* are read-only client status pages guarded by an unguessable token.
const PUBLIC_PATHS = ["/login", "/register", "/share"];

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "");
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const authed = await hasValidSession(req);

  // Signed-in users hitting login/register go to the dashboard.
  if (isAuthPage && authed) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isPublic && !authed) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
