import { beforeAll, expect, test } from "vitest";
import { validateRestaurantInput, type RestaurantInput } from "./restaurants";

const valid: RestaurantInput = {
  name: "Kok Sen",
  maps_url: "",
  links: [],
  cuisine_tags: ["Zi Char"],
  price_range: "$$",
  status: "tried",
  rating: 8,
  notes: null,
  area: "Central",
  multiple_locations: false,
  foods: [],
  photo_urls: [],
};

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
});

const RATING_ERROR = "Rating must be a whole number from 1 to 10";

test.each([[0], [11], [-3]])("rejects rating %i", (rating) => {
  expect(validateRestaurantInput({ ...valid, rating })).toBe(RATING_ERROR);
});

test.each([[1], [10], [null]])("accepts rating %s", (rating) => {
  expect(validateRestaurantInput({ ...valid, rating })).toBeNull();
});

test("rejects non-integer rating", () => {
  expect(validateRestaurantInput({ ...valid, rating: 7.5 })).toBe(RATING_ERROR);
});

test("rejects more than 40 foods", () => {
  const foods = Array.from({ length: 41 }, (_, i) => ({ name: `F${i}`, must_try: false }));
  expect(validateRestaurantInput({ ...valid, foods })).toBe("Too many foods (max 40)");
});

test("rejects an 81-character food name", () => {
  expect(validateRestaurantInput({ ...valid, foods: [{ name: "x".repeat(81), must_try: false }] })).toBe(
    "Food names must be 80 characters or fewer",
  );
});

test("food limits ignore blank rows and surrounding spaces", () => {
  const foods = [...Array.from({ length: 40 }, (_, i) => ({ name: `F${i}`, must_try: false })), { name: "  ", must_try: false }];
  expect(validateRestaurantInput({ ...valid, foods })).toBeNull();
  expect(validateRestaurantInput({ ...valid, foods: [{ name: ` ${"x".repeat(80)} `, must_try: false }] })).toBeNull();
});

test("rejects 13 photos and foreign photo URLs", () => {
  const url = "https://proj.supabase.co/storage/v1/object/public/restaurant-photos/new/a.jpg";
  expect(validateRestaurantInput({ ...valid, photo_urls: Array(13).fill(url) })).toBe("Too many photos (max 12)");
  expect(validateRestaurantInput({ ...valid, photo_urls: ["https://evil.example/a.jpg"] })).toBe(
    "Photos must be uploaded here",
  );
});

test("rejects a link button name over 30 characters", () => {
  expect(
    validateRestaurantInput({ ...valid, links: [{ type: "other", url: "https://a.sg", label: "x".repeat(31) }] }),
  ).toBe("Button names must be 30 characters or fewer");
  expect(
    validateRestaurantInput({ ...valid, links: [{ type: "other", url: "https://a.sg", label: ` ${"x".repeat(30)} ` }] }),
  ).toBeNull();
});
