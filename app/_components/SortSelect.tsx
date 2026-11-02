"use client";

import { CaretDown } from "@phosphor-icons/react";
import { NATURAL_DIR, SORT_OPTIONS, TABLE_SORT_LABEL, type Sort, type SortKey } from "@/lib/sort";
import styles from "./SortSelect.module.css";

// "SORT: NEWEST ADDED ⌄" in the same uppercase text style as "FILTERS +".
// A real <select> underneath, so phones open their own picker and the
// keyboard works as usual.
//
// "Nearest to you" is offered only once the visitor has shared their
// location (the map list). It isn't part of the URL's sort, since a shared
// link can't carry someone else's location.
const NEAREST = "nearest";

export default function SortSelect({
  sort,
  onChange,
  nearest,
  onNearest,
}: {
  sort: Sort;
  onChange: (next: Sort) => void;
  /** With onNearest, "Nearest to you" is offered; true when it's the sort in use. */
  nearest?: boolean;
  onNearest?: () => void;
}) {
  const base =
    sort.key === "status" || sort.key === "area" || sort.key === "price"
      ? [...SORT_OPTIONS, { value: sort.key, label: TABLE_SORT_LABEL[sort.key] }]
      : SORT_OPTIONS;
  const options = onNearest ? [{ value: NEAREST, label: "Nearest to you" }, ...base] : base;
  return (
    <label className={styles.sort}>
      <span aria-hidden>Sort:</span>
      <select
        value={nearest && onNearest ? NEAREST : sort.key}
        aria-label="Sort"
        onChange={(e) => {
          if (e.target.value === NEAREST) return onNearest?.();
          const key = e.target.value as SortKey;
          onChange({ key, dir: NATURAL_DIR[key] });
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown size={14} aria-hidden className={styles.caret} />
    </label>
  );
}
