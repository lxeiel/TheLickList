import { createHash, timingSafeEqual } from "node:crypto";
import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionData = { isAdmin?: boolean };

// Shared with proxy.ts, which checks the same cookie before admin pages load.
export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "lick-list-session",
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// A wrong guess waits this long before it's answered, so guessing the
// password one try after another is slow.
const FAILED_LOGIN_DELAY_MS = 1000;

// Hashing both sides gives equal-length buffers, so the comparison takes the
// same time however much of the guess is right.
function passwordMatches(given: string, expected: string | undefined): boolean {
  // An unset or blank ADMIN_PASSWORD must never let a blank guess in.
  if (!expected) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function login(password: string): Promise<boolean> {
  if (!passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return false;
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  return true;
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (session.isAdmin !== true) {
    redirect("/reborn/login");
  }
}
