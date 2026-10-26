import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

export function getAnonClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  detail: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      ok: false,
      detail: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    };
  }

  try {
    // A query against a table that doesn't exist still proves the API key
    // was accepted (PostgREST returns 404/PGRST205 for "table not found"
    // only after authenticating the request) — unlike the bare /rest/v1/
    // root, which some gateway versions reject for non-secret keys
    // regardless of validity.
    const res = await fetch(`${url}/rest/v1/_connection_check?select=*`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });

    if (res.status === 401) {
      return { ok: false, detail: "Supabase rejected the API key (401)" };
    }

    return { ok: true, detail: "Connected" };
  } catch (err) {
    return { ok: false, detail: `Request failed: ${(err as Error).message}` };
  }
}
