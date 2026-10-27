"use client";

import type { Restaurant } from "@/lib/restaurants";
import EmptyState from "./EmptyState";
import RestaurantRow from "./RestaurantRow";
import styles from "./RestaurantList.module.css";

export function spotCount(n: number): string {
  return n === 1 ? "1 spot" : `${n} spots`;
}

export default function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
  total,
  onClearFilters,
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  total: number;
  onClearFilters: () => void;
}) {
  return (
    <div className={styles.wrap}>
      <p className={styles.count} aria-live="polite">
        {spotCount(restaurants.length)}
      </p>
      {restaurants.length === 0 ? (
        <EmptyState kind={total === 0 ? "no-data" : "no-matches"} onClear={onClearFilters} />
      ) : (
        <ul className={styles.list}>
          {restaurants.map((r) => (
            <li key={r.id}>
              <RestaurantRow restaurant={r} selected={r.id === selectedId} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
