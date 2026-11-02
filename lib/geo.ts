import type { Restaurant } from "./restaurants";

export type Point = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

// Straight-line ("as the crow flies") distance in metres.
export function distanceMeters(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// "350 m" under a kilometre, then "1.2 km", then whole kilometres from 10 km.
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function distanceTo(r: Restaurant, from: Point): number | null {
  return r.lat == null || r.lng == null ? null : distanceMeters(from, { lat: r.lat, lng: r.lng });
}

// Nearest first; spots without a pin stay at the bottom, A–Z.
export function sortByDistance(list: Restaurant[], from: Point): Restaurant[] {
  const distances = new Map(list.map((r) => [r.id, distanceTo(r, from)]));
  return [...list].sort((a, b) => {
    const da = distances.get(a.id) ?? null;
    const db = distances.get(b.id) ?? null;
    if (da == null || db == null) {
      if (da == null && db == null) return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      return da == null ? 1 : -1;
    }
    return da - db;
  });
}
