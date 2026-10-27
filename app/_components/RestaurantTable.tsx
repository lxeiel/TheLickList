"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { formatAdded, formatScore } from "@/lib/format";
import type { Restaurant } from "@/lib/restaurants";
import { toggleSort, type Sort, type SortKey } from "@/lib/sort";
import StatusMark from "./StatusMark";
import styles from "./RestaurantTable.module.css";

function SortHeader({
  label,
  sortKey,
  sort,
  onSortChange,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSortChange: (next: Sort) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      className={align === "right" ? styles.right : undefined}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button type="button" className={styles.sortButton} onClick={() => onSortChange(toggleSort(sort, sortKey))}>
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
      </button>
    </th>
  );
}

export default function RestaurantTable({
  restaurants,
  sort,
  onSortChange,
  selectedId,
  onSelect,
}: {
  restaurants: Restaurant[];
  sort: Sort;
  onSortChange: (next: Sort) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <SortHeader label="Name" sortKey="name" sort={sort} onSortChange={onSortChange} />
          <th scope="col">Status</th>
          <th scope="col">Area</th>
          <th scope="col">Cuisine</th>
          <th scope="col">Price</th>
          <SortHeader label="Score" sortKey="rating" sort={sort} onSortChange={onSortChange} align="right" />
          <SortHeader label="Added" sortKey="added" sort={sort} onSortChange={onSortChange} />
        </tr>
      </thead>
      <tbody>
        {restaurants.map((r) => (
          // The name is the keyboard target; clicking anywhere on the row
          // does the same (the button's click bubbles here).
          <tr key={r.id} data-selected={r.id === selectedId || undefined} onClick={() => onSelect(r.id)}>
            <td className={styles.name}>
              <button type="button" className={styles.nameButton}>
                {r.name}
              </button>
            </td>
            <td>
              <StatusMark status={r.status} showLabel />
            </td>
            <td>{r.area}</td>
            <td>{r.cuisine_tags.join(", ")}</td>
            <td>{r.price_range}</td>
            <td className={`${styles.right} ${styles.score}`}>{formatScore(r)}</td>
            <td className={styles.added}>{formatAdded(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
