import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type SessionData = { isAdmin?: boolean };

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "lick-list-session",
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function login(password: string): Promise<boolean> {
  if (password !== process.env.ADMIN_PASSWORD) {
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
    redirect("/admin/login");
  }
}
