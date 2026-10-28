import { expect, test } from "vitest";
import { buildMenuList, countByStatus, MENU_LIST_LENGTH } from "./menu";
import type { Restaurant } from "./restaurants";

let n = 0;
function r(status: Restaurant["status"], day: number, updatedDay = day): Restaurant {
  n += 1;
  const d = (x: number) => `2026-10-${String(x).padStart(2, "0")}T00:00:00Z`;
  return {
    id: `${status}-${n}`,
    name: `${status} ${n}`,
    maps_url: null,
    lat: null,
    lng: null,
    links: [],
    cuisine_tags: [],
    price_range: null,
    status,
    rating: null,
    notes: null,
    photo_urls: [],
    foods: [],
    area: null,
    created_at: d(day),
    updated_at: d(updatedDay),
  };
}

const ids = (items: { restaurant: Restaurant }[]) => items.map((i) => i.restaurant.id);

test("12 lines: wishlist newest first, then latest licks crossed off", () => {
  const wish = Array.from({ length: 6 }, (_, i) => r("wishlist", i + 1));
  const tried = Array.from({ length: 6 }, (_, i) => r("tried", 1, i + 10));
  const list = buildMenuList([...tried, ...wish]);
  expect(MENU_LIST_LENGTH).toBe(12);
  expect(list).toHaveLength(12);
  expect(ids(list.slice(0, 6))).toEqual([...wish].reverse().map((x) => x.id));
  expect(list.slice(0, 6).every((i) => !i.crossedOff)).toBe(true);
  // Licked ordered by most recent update (when they were most likely licked).
  expect(ids(list.slice(6))).toEqual([...tried].reverse().map((x) => x.id));
  expect(list.slice(6).every((i) => i.crossedOff)).toBe(true);
});

test("a long wishlist still leaves room for 6 crossed-off licks", () => {
  const wish = Array.from({ length: 20 }, (_, i) => r("wishlist", i + 1));
  const tried = Array.from({ length: 10 }, (_, i) => r("tried", i + 1));
  const list = buildMenuList([...wish, ...tried]);
  expect(list.filter((i) => !i.crossedOff)).toHaveLength(6);
  expect(list.filter((i) => i.crossedOff)).toHaveLength(6);
});

test("fills from whichever side has more when the other runs short", () => {
  const wish = Array.from({ length: 20 }, (_, i) => r("wishlist", i + 1));
  const tried = [r("tried", 1)];
  expect(buildMenuList([...wish, ...tried]).filter((i) => !i.crossedOff)).toHaveLength(11);

  const fewWish = [r("wishlist", 1), r("wishlist", 2)];
  const manyTried = Array.from({ length: 20 }, (_, i) => r("tried", i + 1));
  const list = buildMenuList([...fewWish, ...manyTried]);
  expect(list.filter((i) => !i.crossedOff)).toHaveLength(2);
  expect(list.filter((i) => i.crossedOff)).toHaveLength(10);
});

test("empty or tiny lists don't pad", () => {
  expect(buildMenuList([])).toEqual([]);
  expect(buildMenuList([r("tried", 1)])).toHaveLength(1);
});

test("countByStatus counts each status, zero when empty", () => {
  expect(countByStatus([])).toEqual({ tried: 0, wishlist: 0 });
  expect(countByStatus([r("tried", 1), r("tried", 2), r("wishlist", 3)])).toEqual({ tried: 2, wishlist: 1 });
});
