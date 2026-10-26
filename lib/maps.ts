const COORD_PATTERN = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

export async function parseMapsUrl(
  url: string,
): Promise<{ lat: number; lng: number } | null> {
  const direct = url.match(COORD_PATTERN);
  if (direct) {
    return { lat: Number(direct[1]), lng: Number(direct[2]) };
  }

  try {
    const res = await fetch(url);
    const resolved = res.url.match(COORD_PATTERN);
    if (resolved) {
      return { lat: Number(resolved[1]), lng: Number(resolved[2]) };
    }
  } catch {
    return null;
  }

  return null;
}
