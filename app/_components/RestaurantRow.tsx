"use client";

import { formatMeta, formatScore } from "@/lib/format";
import type { Restaurant } from "@/lib/restaurants";
import StatusMark from "./StatusMark";
import styles from "./RestaurantRow.module.css";

export default function RestaurantRow({
  restaurant: r,
  selected,
  onSelect,
  showCuisine = true,
  showPrice = true,
}: {
  restaurant: Restaurant;
  selected: boolean;
  onSelect: (id: string) => void;
  showCuisine?: boolean;
  showPrice?: boolean;
}) {
  const meta = formatMeta(r, { cuisine: showCuisine, price: showPrice });
  const score = formatScore(r);

  return (
    <button
      type="button"
      id={`row-${r.id}`}
      className={styles.row}
      data-selected={selected || undefined}
      onClick={() => onSelect(r.id)}
    >
      <span className={styles.top}>
        <span className={styles.name}>{r.name}</span>
        {score && <span className={styles.score}>{score}</span>}
      </span>
      <span className={styles.meta}>
        <StatusMark status={r.status} showLabel />
        {meta.map((item) => (
          <span key={item} className={styles.metaItem}>
            {item}
          </span>
        ))}
      </span>
    </button>
  );
}
