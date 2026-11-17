import type { Restaurant } from "./restaurants";

type Scored = Pick<Restaurant, "status" | "rating">;

// A wishlist entry has no score to show, even if a rating was saved on it;
// a tried-but-unrated one shows a dash so the gap reads as "not rated".
export function formatScore(r: Scored): string {
  if (r.status === "wishlist") return "";
  return r.rating == null ? "—" : `${r.rating}/10`;
}

export function scoreLabel(r: Scored): string {
  if (r.status === "wishlist") return "";
  return r.rating == null ? "not rated" : `${r.rating} out of 10`;
}

type Described = Pick<Restaurant, "area" | "cuisine_tags" | "price_range" | "multiple_locations">;

// The grey details line under a spot's name: "Central · Cafe · $$ ·
// Multiple locations", leaving out whatever is blank. Rows that show cuisine
// or price in their own column can drop those.
export function formatMeta(r: Described, show: { cuisine?: boolean; price?: boolean } = {}): string[] {
  const { cuisine = true, price = true } = show;
  return [
    r.area,
    cuisine && r.cuisine_tags.length > 0 ? r.cuisine_tags.join(", ") : null,
    price ? r.price_range : null,
    r.multiple_locations ? "Multiple locations" : null,
  ].filter((item): item is string => Boolean(item));
}

// Fixed locale and time zone so the server render and the browser hydrate
// to the same text.
const addedFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatAdded(createdAt: string): string {
  return addedFormat.format(new Date(createdAt));
}

export function spotCount(n: number): string {
  return n === 1 ? "1 spot" : `${n} spots`;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

// "just now", "5 minutes ago", "3 hours ago", "2 days ago".
export function timeAgo(createdAt: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, "hour");
  return plural(Math.floor(hours / 24), "day");
}

// The host of a link ("maps.app.goo.gl"), or null when it isn't a valid URL.
export function linkHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
