"use client";

import type { StatusFilter } from "@/lib/filters";
import styles from "./CheckboxGroup.module.css";

const CHOICES: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Licked", value: "tried" },
  { label: "Gotta Lick", value: "wishlist" },
];

// Status in the Filters menu on phones, where the big status tabs are hidden:
// one choice from All · Licked · Gotta Lick, styled like the score row.
export default function StatusGroup({ value, onChange }: { value: StatusFilter; onChange: (next: StatusFilter) => void }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Status</legend>
      <div className={styles.choices}>
        {CHOICES.map((choice) => (
          <label key={choice.value} className={styles.choice}>
            <input type="radio" name="status" checked={value === choice.value} onChange={() => onChange(choice.value)} />
            {choice.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
