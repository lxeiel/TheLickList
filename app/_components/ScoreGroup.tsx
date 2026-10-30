"use client";

import { MIN_SCORES } from "@/lib/filters";
import styles from "./CheckboxGroup.module.css";

// Minimum score in the Filters menu: one choice from Any · 7+ · 8+ · 9+.
export default function ScoreGroup({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  const choices: { label: string; score: number | null }[] = [
    { label: "Any", score: null },
    ...MIN_SCORES.map((score) => ({ label: `${score}+`, score })),
  ];

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Score</legend>
      <div className={styles.choices}>
        {choices.map(({ label, score }) => (
          <label key={label} className={styles.choice}>
            <input type="radio" name="min-score" checked={value === score} onChange={() => onChange(score)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
