import { getServiceClient } from "./supabase";

// Server-only: login tries are logged by hashed IP (see
// supabase/migrations/0006_login_attempts.sql).

// Each IP gets this many tries per window; the rest are refused unchecked.
export const LOGIN_ATTEMPT_LIMIT = 10;
export const LOGIN_WINDOW_SECONDS = 15 * 60;

// Logs this try and returns how many the IP has made in the window,
// including this one.
export async function recordLoginAttempt(ipHash: string): Promise<number> {
  const { data, error } = await getServiceClient().rpc("record_login_attempt", {
    p_ip_hash: ipHash,
    p_window_seconds: LOGIN_WINDOW_SECONDS,
  });

  if (error) {
    throw error;
  }

  return data as number;
}

// After a successful login, so the admin's own typos don't pile up.
export async function clearLoginAttempts(ipHash: string): Promise<void> {
  const { error } = await getServiceClient().from("login_attempt").delete().eq("ip_hash", ipHash);

  if (error) {
    throw error;
  }
}
