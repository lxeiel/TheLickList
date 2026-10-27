import { expect, test } from "vitest";
import { parseSort, sortRestaurants, toggleSort, writeSort } from "./sort";
import type { Restaurant } from "./restaurants";

function restaurant(id: string, name: string, overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id,
    name,
    maps_url: null,
    lat: null,
    lng: null,
    links: [],
    cuisine_tags: [],
    price_range: null,
    status: "tried",
    rating: null,
    notes: null,
    photo_urls: [],
    area: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

const fixture: Restaurant[] = [
  restaurant("nine", "Kok Sen", { rating: 9, created_at: "2026-10-03T00:00:00Z" }),
  restaurant("seven", "Song Fa", { rating: 7, created_at: "2026-10-05T00:00:00Z" }),
  restaurant("unrated", "Zen Noodle", { rating: null, created_at: "2026-10-01T00:00:00Z" }),
  restaurant("wish", "Candlenut", { status: "wishlist", rating: null, created_at: "2026-10-04T00:00:00Z" }),
  restaurant("aaa", "aaa Porridge", { rating: 7, created_at: "2026-10-02T00:00:00Z" }),
];

const ids = (list: Restaurant[]) => list.map((r) => r.id);

test("parseSort falls back to defaults", () => {
  expect(parseSort(new URLSearchParams(""))).toEqual({ key: "added", dir: "desc" });
  expect(parseSort(new URLSearchParams("sort=banana&dir=up"))).toEqual({ key: "added", dir: "desc" });
  expect(parseSort(new URLSearchParams("sort=name"))).toEqual({ key: "name", dir: "asc" });
  expect(parseSort(new URLSearchParams("sort=rating&dir=asc"))).toEqual({ key: "rating", dir: "asc" });
});

test("writeSort omits defaults", () => {
  expect(writeSort(new URLSearchParams("q=x"), { key: "added", dir: "desc" }).toString()).toBe("q=x");
  expect(writeSort(new URLSearchParams("sort=name"), { key: "rating", dir: "asc" }).toString()).toBe(
    "sort=rating&dir=asc",
  );
  expect(writeSort(new URLSearchParams(), { key: "name", dir: "asc" }).toString()).toBe("sort=name");
});

test.each([
  ["added", "asc"],
  ["added", "desc"],
  ["rating", "asc"],
  ["rating", "desc"],
  ["name", "asc"],
  ["name", "desc"],
] as const)("writeSort → parseSort round-trips %s %s", (key, dir) => {
  expect(parseSort(writeSort(new URLSearchParams(), { key, dir }))).toEqual({ key, dir });
});

test("toggleSort flips same key, resets on new key", () => {
  expect(toggleSort({ key: "rating", dir: "desc" }, "rating")).toEqual({ key: "rating", dir: "asc" });
  expect(toggleSort({ key: "rating", dir: "asc" }, "name")).toEqual({ key: "name", dir: "asc" });
  expect(toggleSort({ key: "name", dir: "asc" }, "added")).toEqual({ key: "added", dir: "desc" });
});

test("sortRestaurants puts unscored last in both directions", () => {
  // Ties break by name; unscored (wishlist or unrated) are last, by name.
  expect(ids(sortRestaurants(fixture, { key: "rating", dir: "desc" }))).toEqual([
    "nine",
    "aaa",
    "seven",
    "wish",
    "unrated",
  ]);
  expect(ids(sortRestaurants(fixture, { key: "rating", dir: "asc" }))).toEqual([
    "aaa",
    "seven",
    "nine",
    "wish",
    "unrated",
  ]);
});

test("sorts by added date", () => {
  expect(ids(sortRestaurants(fixture, { key: "added", dir: "desc" }))).toEqual([
    "seven",
    "wish",
    "nine",
    "aaa",
    "unrated",
  ]);
});

test("sorts by name case-insensitively", () => {
  expect(ids(sortRestaurants(fixture, { key: "name", dir: "asc" }))).toEqual([
    "aaa",
    "wish",
    "nine",
    "seven",
    "unrated",
  ]);
  expect(ids(sortRestaurants(fixture, { key: "name", dir: "desc" }))[0]).toBe("unrated");
});

test("does not mutate its input", () => {
  const before = ids(fixture);
  sortRestaurants(fixture, { key: "name", dir: "asc" });
  expect(ids(fixture)).toEqual(before);
});
