import type { Restaurant, RestaurantStatus } from "./restaurants";

export const MENU_LIST_LENGTH = 12;
const HALF = MENU_LIST_LENGTH / 2;

export type MenuListItem = { restaurant: Restaurant; crossedOff: boolean };

const newestBy = (key: "created_at" | "updated_at") => (a: Restaurant, b: Restaurant) =>
  Date.parse(b[key]) - Date.parse(a[key]);

// "The list" on the homepage: Gotta Lick spots (newest first), then the most
// recently licked spots crossed off. Each side gets half the lines, and a
// side that runs short hands its spare lines to the other. Licked spots are
// ordered by last update, the closest we have to "when it was licked" (the
// database doesn't record status changes).
export function buildMenuList(restaurants: Restaurant[]): MenuListItem[] {
  const wish = restaurants.filter((r) => r.status === "wishlist").sort(newestBy("created_at"));
  const licked = restaurants.filter((r) => r.status === "tried").sort(newestBy("updated_at"));

  const wishCount = Math.min(wish.length, Math.max(HALF, MENU_LIST_LENGTH - licked.length));
  const lickedCount = Math.min(licked.length, MENU_LIST_LENGTH - wishCount);

  return [
    ...wish.slice(0, wishCount).map((restaurant) => ({ restaurant, crossedOff: false })),
    ...licked.slice(0, lickedCount).map((restaurant) => ({ restaurant, crossedOff: true })),
  ];
}

export function countByStatus(restaurants: Restaurant[]): Record<RestaurantStatus, number> {
  const counts: Record<RestaurantStatus, number> = { tried: 0, wishlist: 0 };
  for (const r of restaurants) counts[r.status] += 1;
  return counts;
}
