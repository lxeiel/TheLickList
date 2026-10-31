"use client";

import { CaretDown } from "@phosphor-icons/react";
import { NATURAL_DIR, SORT_OPTIONS, TABLE_SORT_LABEL, type Sort, type SortKey } from "@/lib/sort";
import styles from "./SortSelect.module.css";

// "SORT: NEWEST ADDED ⌄" in the same uppercase text style as "FILTERS +".
// A real <select> underneath, so phones open their own picker and the
// keyboard works as usual.
export default function SortSelect({ sort, onChange }: { sort: Sort; onChange: (next: Sort) => void }) {
  const options =
    sort.key === "status" || sort.key === "area" || sort.key === "price"
      ? [...SORT_OPTIONS, { value: sort.key, label: TABLE_SORT_LABEL[sort.key] }]
      : SORT_OPTIONS;
  return (
    <label className={styles.sort}>
      <span aria-hidden>Sort:</span>
      <select
        value={sort.key}
        aria-label="Sort"
        onChange={(e) => {
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
