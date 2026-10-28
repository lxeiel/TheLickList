import { expect, test } from "vitest";
import { normalizeFoods, sortFoodsForDisplay } from "./foods";

test("normalizeFoods trims and drops blanks, keeping order", () => {
  expect(
    normalizeFoods([
      { name: "  Laksa ", must_try: false },
      { name: "   ", must_try: true },
      { name: "Udon", must_try: true },
    ]),
  ).toEqual([
    { name: "Laksa", must_try: false },
    { name: "Udon", must_try: true },
  ]);
});

test("sortFoodsForDisplay puts Must try first and keeps entry order within groups", () => {
  const foods = [
    { name: "A", must_try: false },
    { name: "B", must_try: true },
    { name: "C", must_try: false },
    { name: "D", must_try: true },
  ];
  expect(sortFoodsForDisplay(foods).map((f) => f.name)).toEqual(["B", "D", "A", "C"]);
  expect(foods.map((f) => f.name)).toEqual(["A", "B", "C", "D"]); // input untouched
});
