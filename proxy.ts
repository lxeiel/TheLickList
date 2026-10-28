import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

// Admin pages also check the session themselves (requireAdmin), but they
// stream behind the loading screen, so a logged-out visitor got a page that
// redirected itself. Checking here sends them to the login page before
// anything renders.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(nextProxyCookies(request, response), sessionOptions);
  if (session.isAdmin === true) return response;
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

// Everything under /admin except the login page itself.
export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
