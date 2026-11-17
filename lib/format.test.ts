import { expect, test } from "vitest";
import { formatAdded, formatMeta, formatScore, linkHost, scoreLabel, timeAgo } from "./format";

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

test("timeAgo", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  expect(timeAgo("2026-11-17T11:59:30Z", now)).toBe("just now");
  expect(timeAgo("2026-11-17T11:59:00Z", now)).toBe("1 minute ago");
  expect(timeAgo("2026-11-17T09:00:00Z", now)).toBe("3 hours ago");
  expect(timeAgo("2026-11-15T12:00:00Z", now)).toBe("2 days ago");
});

test("linkHost returns the host of a valid URL and null for garbage", () => {
  expect(linkHost("https://maps.app.goo.gl/abc123")).toBe("maps.app.goo.gl");
  expect(linkHost("not a url")).toBeNull();
});
