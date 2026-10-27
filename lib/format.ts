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
