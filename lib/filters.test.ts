import { describe, expect, test } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  deriveOptions,
  findSpot,
  listHref,
  mapHref,
  parseFilters,
  writeFilters,
} from "./filters";
import type { Restaurant } from "./restaurants";

function restaurant(overrides: Partial<Restaurant> & Pick<Restaurant, "id" | "name">): Restaurant {
  return {
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
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

const fixture: Restaurant[] = [
  restaurant({ id: "a", name: "Ramen House", status: "tried", cuisine_tags: ["Ramen"], area: "Central", price_range: "$$" }),
  restaurant({ id: "b", name: "Hill Street Tai Hwa", status: "tried", cuisine_tags: ["Hawker", "Noodles"], area: "Central", price_range: "$" }),
  restaurant({ id: "c", name: "Tsuta", status: "wishlist", cuisine_tags: ["ramen"], area: "Tokyo", price_range: "$$$" }),
  restaurant({ id: "d", name: "Mystery Spot", status: "tried", foods: [{ name: "Curry Laksa", must_try: true }] }), // no tags, area or price
  restaurant({ id: "e", name: "Corner Cafe", status: "wishlist", cuisine_tags: ["Cafe"], area: "Ramen Street" }),
];

const ids = (list: Restaurant[]) => list.map((r) => r.id);

describe("parseFilters / writeFilters", () => {
  test("parseFilters reads repeatable params", () => {
    expect(
      parseFilters(new URLSearchParams("status=tried&q=noodle&cuisine=Ramen&cuisine=Noodles&area=Central&price=$")),
    ).toEqual({ status: "tried", q: "noodle", cuisine: ["Ramen", "Noodles"], area: ["Central"], price: ["$"], minScore: null });
  });

  test("parseFilters ignores unknown values", () => {
    expect(parseFilters(new URLSearchParams("status=maybe&foo=bar"))).toEqual(EMPTY_FILTERS);
  });

  test("writeFilters round-trips and preserves other params", () => {
    const out = writeFilters(new URLSearchParams("spot=abc&sort=rating"), {
      ...EMPTY_FILTERS,
      status: "wishlist",
      area: ["East"],
    });
    expect(out.toString()).toBe("spot=abc&sort=rating&status=wishlist&area=East");
    expect(parseFilters(out)).toEqual({ ...EMPTY_FILTERS, status: "wishlist", area: ["East"] });
  });

  test("writeFilters omits defaults", () => {
    expect(writeFilters(new URLSearchParams("status=tried&q=x&cuisine=Ramen"), EMPTY_FILTERS).toString()).toBe("");
  });
});

describe("applyFilters", () => {
  test("q matches food names", () => {
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, q: "laksa" }))).toEqual(["d"]);
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, status: "wishlist", q: "laksa" }))).toEqual([]);
  });

  test("no filters returns everything", () => {
    expect(ids(applyFilters(fixture, EMPTY_FILTERS))).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("ANDs across filters and ORs within one", () => {
    const out = applyFilters(fixture, { ...EMPTY_FILTERS, status: "tried", cuisine: ["Ramen", "Noodles"] });
    expect(ids(out)).toEqual(["a", "b"]);
  });

  test("trims and lowercases search", () => {
    // name "Ramen House", tag "ramen", area "Ramen Street"
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, q: "  RAMEN " }))).toEqual(["a", "c", "e"]);
  });

  test("ignores missing fields", () => {
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, area: ["Central"] }))).toEqual(["a", "b"]);
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, price: ["$"] }))).toEqual(["b"]);
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, q: "zzz" }))).toEqual([]);
  });

  test("cuisine and area values match case-insensitively", () => {
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, cuisine: ["RAMEN"] }))).toEqual(["a", "c"]);
    expect(ids(applyFilters(fixture, { ...EMPTY_FILTERS, area: ["tokyo"] }))).toEqual(["c"]);
  });
});

describe("deriveOptions", () => {
  test("dedupes case-insensitively, keeping the first spelling", () => {
    const { cuisine } = deriveOptions(fixture);
    expect(cuisine.filter((c) => c.toLowerCase() === "ramen")).toEqual(["Ramen"]);
  });

  test("skips empty values and orders them", () => {
    expect(deriveOptions(fixture)).toEqual({
      cuisine: ["Cafe", "Hawker", "Noodles", "Ramen"],
      area: ["Central", "Ramen Street", "Tokyo"],
      price: ["$", "$$", "$$$"],
    });
  });
});

test("activeFilterCount counts menu selections only", () => {
  expect(activeFilterCount({ status: "tried", q: "x", cuisine: ["A", "B"], area: ["C"], price: [], minScore: null })).toBe(3);
});

test("findSpot returns null when absent or filtered out", () => {
  expect(findSpot(fixture, "nope")).toBeNull();
  expect(findSpot([], "a")).toBeNull();
  expect(findSpot(fixture, null)).toBeNull();
  expect(findSpot(fixture, "a")).toBe(fixture[0]);
});

test("mapHref and listHref carry the right params", () => {
  const p = new URLSearchParams("status=tried&area=Central&sort=rating&dir=asc&spot=abc");
  // The sort travels between the map list and the List page.
  expect(mapHref(p)).toBe("/?status=tried&area=Central&sort=rating&dir=asc");
  expect(mapHref(p, "xyz")).toBe("/?status=tried&area=Central&sort=rating&dir=asc&spot=xyz");
  expect(listHref(p)).toBe("/list?status=tried&area=Central&sort=rating&dir=asc");
  expect(mapHref(new URLSearchParams())).toBe("/");
  expect(listHref(new URLSearchParams("spot=abc"))).toBe("/list");
});

describe("minimum score", () => {
  const scored = [
    restaurant({ id: "s9", name: "Nine", status: "tried", rating: 9 }),
    restaurant({ id: "s8", name: "Eight", status: "tried", rating: 8 }),
    restaurant({ id: "s6", name: "Six", status: "tried", rating: 6 }),
    restaurant({ id: "su", name: "Unrated", status: "tried", rating: null }),
    restaurant({ id: "sw", name: "Wish", status: "wishlist", rating: 10 }),
  ];

  test("keeps only Licked spots scored at or above the minimum", () => {
    expect(ids(applyFilters(scored, { ...EMPTY_FILTERS, minScore: 8 }))).toEqual(["s9", "s8"]);
    expect(ids(applyFilters(scored, EMPTY_FILTERS))).toEqual(["s9", "s8", "s6", "su", "sw"]);
  });

  test("reads and writes ?score=, ignoring values other than 7, 8 and 9", () => {
    expect(parseFilters(new URLSearchParams("score=8")).minScore).toBe(8);
    expect(parseFilters(new URLSearchParams("score=5")).minScore).toBeNull();
    expect(parseFilters(new URLSearchParams("score=abc")).minScore).toBeNull();
    expect(writeFilters(new URLSearchParams(), { ...EMPTY_FILTERS, minScore: 9 }).toString()).toBe("score=9");
    expect(writeFilters(new URLSearchParams("score=9"), EMPTY_FILTERS).toString()).toBe("");
  });

  test("counts as one active filter", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, minScore: 7, price: ["$"] })).toBe(2);
  });
});
