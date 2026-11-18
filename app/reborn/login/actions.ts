"use server";

import { checkBotId } from "botid/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { login, loginKeyMatches } from "@/lib/auth";
import { clientIp, hashIp } from "@/lib/recommendations";
import { LOGIN_ATTEMPT_LIMIT, clearLoginAttempts, recordLoginAttempt } from "@/lib/loginAttempts";

const INVALID = "Invalid credentials";
const GENERIC_ERROR = "Couldn't log in. Try again.";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");

  // Checked here as well as in the proxy: an action can be called directly,
  // without ever loading the page. A wrong key isn't logged as a try.
  if (!loginKeyMatches(formData.get("key"))) return { error: GENERIC_ERROR };

  // Every check fails closed: if the limit can't be checked, no guess is.
  try {
    const verification = await checkBotId();
    if (verification.isBot) return { error: GENERIC_ERROR };

    const secret = process.env.SESSION_SECRET;
    if (!secret) return { error: GENERIC_ERROR };
    const ipHash = hashIp(clientIp(await headers()), secret);

    // Over the limit, the password isn't even checked, so guessing from one
    // address stops dead rather than just slowing down.
    if ((await recordLoginAttempt(ipHash)) > LOGIN_ATTEMPT_LIMIT) {
      return { error: "Too many tries. Wait a few minutes and try again." };
    }

    if (!(await login(password))) return { error: INVALID };

    try {
      await clearLoginAttempts(ipHash);
    } catch (err) {
      // Logged in anyway; the tries just age out of the window.
      console.error("Couldn't clear login attempts", err);
    }
  } catch {
    return { error: GENERIC_ERROR };
  }

  // Outside the try: redirect() works by throwing.
  redirect("/reborn");
}
