"use client";

import type { FoodItem } from "@/lib/foods";
import { MAX_FOOD_NAME, MAX_FOODS } from "@/lib/foods";
import styles from "./admin.module.css";

// "Food tried" rows in the restaurant popup, built like Links. Blank rows are
// dropped when the restaurant saves.
export function FoodRows({ foods, onChange }: { foods: FoodItem[]; onChange: (foods: FoodItem[]) => void }) {
  const update = (index: number, patch: Partial<FoodItem>) =>
    onChange(foods.map((food, i) => (i === index ? { ...food, ...patch } : food)));

  return (
    <fieldset>
      <legend>Food tried</legend>
      {foods.map((food, i) => (
        <div key={i} className={styles.foodRow}>
          <input
            value={food.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Duck Fat Mala Chicken"
            maxLength={MAX_FOOD_NAME}
            aria-label={`Food ${i + 1}`}
          />
          <label className={styles.mustTry}>
            <input type="checkbox" checked={food.must_try} onChange={(e) => update(i, { must_try: e.target.checked })} />
            Must try
          </label>
          <button type="button" onClick={() => onChange(foods.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      {foods.length < MAX_FOODS && (
        <button type="button" onClick={() => onChange([...foods, { name: "", must_try: false }])}>
          Add food
        </button>
      )}
    </fieldset>
  );
}
