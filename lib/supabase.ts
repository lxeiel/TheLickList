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
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
    });

    if (!res.ok) {
      return { ok: false, detail: `Supabase responded with status ${res.status}` };
    }

    return { ok: true, detail: "Connected" };
  } catch (err) {
    return { ok: false, detail: `Request failed: ${(err as Error).message}` };
  }
}
