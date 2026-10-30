import { expect, test } from "vitest";
import { formatAdded, formatMeta, formatScore, scoreLabel } from "./format";

test("formatScore handles every status/rating combination", () => {
  expect(formatScore({ status: "tried", rating: 9 })).toBe("9/10");
  expect(formatScore({ status: "tried", rating: null })).toBe("—");
  expect(formatScore({ status: "wishlist", rating: null })).toBe("");
  // A wishlist entry never shows a score, even if one was saved.
  expect(formatScore({ status: "wishlist", rating: 7 })).toBe("");
});

test("formatScore shows out-of-range ratings as stored", () => {
  expect(formatScore({ status: "tried", rating: 12 })).toBe("12/10");
});

test("scoreLabel is screen-reader friendly", () => {
  expect(scoreLabel({ status: "tried", rating: 9 })).toBe("9 out of 10");
  expect(scoreLabel({ status: "tried", rating: null })).toBe("not rated");
  expect(scoreLabel({ status: "wishlist", rating: null })).toBe("");
});

test("formatAdded is month and year in UTC", () => {
  expect(formatAdded("2026-10-27T10:00:00Z")).toBe("Oct 2026");
  // 00:30 on Nov 1 in Singapore is still Oct 31 in UTC.
  expect(formatAdded("2026-11-01T00:30:00+08:00")).toBe("Oct 2026");
});

test("formatMeta lists area, cuisine, price, then Multiple locations, skipping blanks", () => {
  const spot = { area: "Central", cuisine_tags: ["Cafe", "Brunch"], price_range: "$$", multiple_locations: true };
  expect(formatMeta(spot)).toEqual(["Central", "Cafe, Brunch", "$$", "Multiple locations"]);
  expect(formatMeta({ ...spot, multiple_locations: false })).toEqual(["Central", "Cafe, Brunch", "$$"]);
  expect(formatMeta({ area: null, cuisine_tags: [], price_range: null, multiple_locations: true })).toEqual([
    "Multiple locations",
  ]);
});

test("formatMeta can leave out cuisine and price", () => {
  const spot = { area: "Central", cuisine_tags: ["Cafe"], price_range: "$$", multiple_locations: true };
  expect(formatMeta(spot, { cuisine: false, price: false })).toEqual(["Central", "Multiple locations"]);
});
