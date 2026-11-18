import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";
import { loginKeyMatches, sessionOptions, type SessionData } from "@/lib/auth";

// Runs before anything under /reborn renders. The login page needs the
// secret key in its URL; every other admin page needs the admin session.
// Anyone without either gets the site's ordinary 404, so there's no sign an
// admin area exists. (Admin pages and actions also check the session
// themselves, with requireAdmin.)
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/reborn/login") {
    return loginKeyMatches(searchParams.get("key")) ? NextResponse.next() : notFound(request);
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(nextProxyCookies(request, response), sessionOptions);
  if (session.isAdmin === true) return response;
  return notFound(request);
}

// The same page and status as any missing page.
function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export const config = {
  matcher: ["/reborn", "/reborn/:path*"],
};
