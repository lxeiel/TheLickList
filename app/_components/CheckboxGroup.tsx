"use client";

import styles from "./CheckboxGroup.module.css";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Values from the URL may differ in case from the data ("ramen" vs "Ramen"),
// so membership is case-insensitive, matching how filtering works.
export default function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  hideLegend = false,
}: {
  legend: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  hideLegend?: boolean;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={hideLegend ? "visually-hidden" : styles.legend}>{legend}</legend>
      {options.length === 0 && <p className={styles.empty}>None yet</p>}
      {options.map((option) => {
        const checked = selected.some((s) => same(s, option));
        return (
          <label key={option} className={styles.option}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? selected.filter((s) => !same(s, option)) : [...selected, option])
              }
            />
            {option}
          </label>
        );
      })}
    </fieldset>
  );
}
