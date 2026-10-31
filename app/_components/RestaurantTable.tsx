"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { formatScore } from "@/lib/format";
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
          <SortHeader label="Status" sortKey="status" sort={sort} onSortChange={onSortChange} />
          <SortHeader label="Area" sortKey="area" sort={sort} onSortChange={onSortChange} />
          {/* A spot can have several cuisines, so there's no single value to sort by. */}
          <th scope="col">Cuisine</th>
          <SortHeader label="Price" sortKey="price" sort={sort} onSortChange={onSortChange} />
          <SortHeader label="Score" sortKey="rating" sort={sort} onSortChange={onSortChange} align="right" />
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
            <td>
              {r.area}
              {r.multiple_locations &&
                (r.area ? (
                  <span className={styles.more} title="Multiple locations">
                    {" "}+ more<span className="visually-hidden"> locations</span>
                  </span>
                ) : (
                  <span className={styles.more}>Multiple</span>
                ))}
            </td>
            <td>{r.cuisine_tags.join(", ")}</td>
            <td>{r.price_range}</td>
            <td className={`${styles.right} ${styles.score}`}>{formatScore(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
