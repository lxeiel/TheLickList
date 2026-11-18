// A place link carries two positions: "!3d<lat>!4d<lng>" is the place itself,
// while "@<lat>,<lng>" is where Google's map camera was centred — offset from
// the place (Google shifts it so the place clears its side panel). Prefer the
// place; fall back to the camera for links without one (a dropped pin, a
// plain map view).
const PLACE_PATTERN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
const CAMERA_PATTERN = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

function coordsIn(url: string): { lat: number; lng: number } | null {
  const match = url.match(PLACE_PATTERN) ?? url.match(CAMERA_PATTERN);
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
}

// Only fetch Google's own domains, and only http(s), at every hop of a
// redirect chain — otherwise a pasted maps_url could make the server fetch an
// arbitrary internal/private address (SSRF), directly or via a redirect.
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
  const direct = coordsIn(url);
  if (direct) {
    return direct;
  }

  // Redirects are followed by hand: fetch's own following would go wherever
  // the Location header points, past the host check.
  const signal = AbortSignal.timeout(5000);
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowedRedirectTarget(current)) {
        return null;
      }

      const res = await fetch(current, { redirect: "manual", signal });
      // Only the Location header is needed, never the page.
      await res.body?.cancel();
      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) {
        return null;
      }

      current = new URL(location, current).toString();
      const resolved = coordsIn(current);
      if (resolved) {
        return resolved;
      }
    }
  } catch {
    return null;
  }

  return null;
}

// A short link takes a hop or two to reach the place page.
const MAX_REDIRECTS = 5;
