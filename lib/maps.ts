const COORD_PATTERN = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

// Only follow redirects on Google's own domains, and only http(s) — otherwise
// a pasted maps_url could make the server fetch an arbitrary internal/private
// address (SSRF) via a non-Maps link.
const ALLOWED_REDIRECT_HOSTS = [/^maps\.app\.goo\.gl$/, /^goo\.gl$/, /(^|\.)google\.com$/];

function isAllowedRedirectTarget(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }
    return ALLOWED_REDIRECT_HOSTS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

export async function parseMapsUrl(
  url: string,
): Promise<{ lat: number; lng: number } | null> {
  const direct = url.match(COORD_PATTERN);
  if (direct) {
    return { lat: Number(direct[1]), lng: Number(direct[2]) };
  }

  if (!isAllowedRedirectTarget(url)) {
    return null;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const resolved = res.url.match(COORD_PATTERN);
    if (resolved) {
      return { lat: Number(resolved[1]), lng: Number(resolved[2]) };
    }
  } catch {
    return null;
  }

  return null;
}
