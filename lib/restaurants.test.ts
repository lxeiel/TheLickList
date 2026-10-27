import { expect, test } from "vitest";
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
};

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
