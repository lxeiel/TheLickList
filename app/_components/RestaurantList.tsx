"use client";

import { spotCount } from "@/lib/format";
import type { Restaurant } from "@/lib/restaurants";
import type { Sort } from "@/lib/sort";
import EmptyState from "./EmptyState";
import RestaurantRow from "./RestaurantRow";
import SortSelect from "./SortSelect";
import styles from "./RestaurantList.module.css";

export default function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
  total,
  onClearFilters,
  sort,
  onSortChange,
  nearest,
  onNearest,
  distanceOf,
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  total: number;
  onClearFilters: () => void;
  /** With both, a sort menu sits beside the count (the map list). */
  sort?: Sort;
  onSortChange?: (next: Sort) => void;
  nearest?: boolean;
  onNearest?: () => void;
  /** How far each spot is from the visitor, once they've shared their location. */
  distanceOf?: (r: Restaurant) => string | null;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.count} aria-live="polite">
          {spotCount(restaurants.length)}
        </p>
        {sort && onSortChange && restaurants.length > 1 && (
          <SortSelect sort={sort} onChange={onSortChange} nearest={nearest} onNearest={onNearest} />
        )}
      </div>
      {restaurants.length === 0 ? (
        <EmptyState kind={total === 0 ? "no-data" : "no-matches"} onClear={onClearFilters} />
      ) : (
        <ul className={styles.list}>
          {restaurants.map((r) => (
            <li key={r.id}>
              <RestaurantRow
                restaurant={r}
                selected={r.id === selectedId}
                onSelect={onSelect}
                distance={distanceOf?.(r)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
