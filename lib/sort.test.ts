import { expect, test } from "vitest";
import { DEFAULT_SORT, parseSort, sortChipLabel, sortRestaurants, toggleSort, writeSort } from "./sort";
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
    foods: [],
    area: null,
    multiple_locations: false,
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
  ["status", "asc"],
  ["status", "desc"],
  ["area", "asc"],
  ["area", "desc"],
  ["price", "asc"],
  ["price", "desc"],
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

test("parseSort reads the table-only keys at their natural direction", () => {
  expect(parseSort(new URLSearchParams("sort=status"))).toEqual({ key: "status", dir: "asc" });
  expect(parseSort(new URLSearchParams("sort=area"))).toEqual({ key: "area", dir: "asc" });
  expect(parseSort(new URLSearchParams("sort=price&dir=desc"))).toEqual({ key: "price", dir: "desc" });
});

test("sorts by status, Licked first, then by name", () => {
  const list = [
    restaurant("w2", "Zam Zam", { status: "wishlist" }),
    restaurant("t2", "Tian Tian"),
    restaurant("w1", "Annalakshmi", { status: "wishlist" }),
    restaurant("t1", "Ah Hock"),
  ];
  expect(ids(sortRestaurants(list, { key: "status", dir: "asc" }))).toEqual(["t1", "t2", "w1", "w2"]);
  // Flipping reverses the groups; names stay A–Z within each.
  expect(ids(sortRestaurants(list, { key: "status", dir: "desc" }))).toEqual(["w1", "w2", "t1", "t2"]);
});

test("sorts by area A–Z with blanks last in both directions", () => {
  const list = [
    restaurant("none", "No Area"),
    restaurant("tp", "Toa Payoh Lor 8", { area: "Toa Payoh" }),
    restaurant("bd2", "Song Fa", { area: "bedok" }),
    restaurant("bd1", "Chai Chee", { area: "Bedok" }),
  ];
  expect(ids(sortRestaurants(list, { key: "area", dir: "asc" }))).toEqual(["bd1", "bd2", "tp", "none"]);
  expect(ids(sortRestaurants(list, { key: "area", dir: "desc" }))).toEqual(["tp", "bd1", "bd2", "none"]);
});

test("sorts by price cheapest first with blanks last in both directions", () => {
  const list = [
    restaurant("none", "No Price"),
    restaurant("p3", "Burnt Ends", { price_range: "$$$" }),
    restaurant("p1b", "Tian Tian", { price_range: "$" }),
    restaurant("p1a", "Ah Hock", { price_range: "$" }),
    restaurant("p2", "Candlenut", { price_range: "$$" }),
  ];
  expect(ids(sortRestaurants(list, { key: "price", dir: "asc" }))).toEqual(["p1a", "p1b", "p2", "p3", "none"]);
  expect(ids(sortRestaurants(list, { key: "price", dir: "desc" }))).toEqual(["p3", "p2", "p1a", "p1b", "none"]);
});

test("does not mutate its input", () => {
  const before = ids(fixture);
  sortRestaurants(fixture, { key: "name", dir: "asc" });
  expect(ids(fixture)).toEqual(before);
});

test("sortChipLabel is null for the default sort", () => {
  expect(sortChipLabel(DEFAULT_SORT)).toBeNull();
  expect(sortChipLabel(parseSort(new URLSearchParams("")))).toBeNull();
});

test.each([
  [{ key: "added", dir: "asc" }, "Added, oldest first"],
  [{ key: "name", dir: "asc" }, "Name, A–Z"],
  [{ key: "name", dir: "desc" }, "Name, Z–A"],
  [{ key: "status", dir: "asc" }, "Status, Licked first"],
  [{ key: "status", dir: "desc" }, "Status, Gotta Lick first"],
  [{ key: "area", dir: "asc" }, "Area, A–Z"],
  [{ key: "area", dir: "desc" }, "Area, Z–A"],
  [{ key: "price", dir: "asc" }, "Price, cheapest first"],
  [{ key: "price", dir: "desc" }, "Price, priciest first"],
  [{ key: "rating", dir: "desc" }, "Score, highest first"],
  [{ key: "rating", dir: "asc" }, "Score, lowest first"],
] as const)("sortChipLabel(%o) is %s", (sort, label) => {
  expect(sortChipLabel(sort)).toBe(label);
});
