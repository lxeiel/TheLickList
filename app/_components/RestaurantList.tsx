"use client";

import type { Restaurant } from "@/lib/restaurants";
import type { Sort } from "@/lib/sort";
import EmptyState from "./EmptyState";
import RestaurantRow from "./RestaurantRow";
import SortSelect from "./SortSelect";
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
  sort,
  onSortChange,
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  total: number;
  onClearFilters: () => void;
  /** With both, a sort menu sits beside the count (the map list). */
  sort?: Sort;
  onSortChange?: (next: Sort) => void;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.count} aria-live="polite">
          {spotCount(restaurants.length)}
        </p>
        {sort && onSortChange && restaurants.length > 1 && <SortSelect sort={sort} onChange={onSortChange} />}
      </div>
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
