"use client";

import { CaretDown } from "@phosphor-icons/react";
import { NATURAL_DIR, SORT_OPTIONS, type Sort, type SortKey } from "@/lib/sort";
import styles from "./SortSelect.module.css";

// "SORT: NEWEST ADDED ⌄" in the same uppercase text style as "FILTERS +".
// A real <select> underneath, so phones open their own picker and the
// keyboard works as usual.
export default function SortSelect({ sort, onChange }: { sort: Sort; onChange: (next: Sort) => void }) {
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
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown size={14} aria-hidden className={styles.caret} />
    </label>
  );
}
