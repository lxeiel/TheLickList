// "Food tried" on a restaurant: an ordered list of names, each optionally
// tagged Must try.
export type FoodItem = { name: string; must_try: boolean };

export const MAX_FOODS = 40;
export const MAX_FOOD_NAME = 80;

// What gets saved: names trimmed, blank rows (an "Add food" left empty)
// dropped, order kept.
export function normalizeFoods(foods: FoodItem[]): FoodItem[] {
  return foods
    .map((food) => ({ name: food.name.trim(), must_try: food.must_try }))
    .filter((food) => food.name !== "");
}

// What gets shown: Must try first, each group in the order Lex entered it.
export function sortFoodsForDisplay(foods: FoodItem[]): FoodItem[] {
  return [...foods.filter((food) => food.must_try), ...foods.filter((food) => !food.must_try)];
}
