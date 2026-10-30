"use client";

import { useState } from "react";
import { collapsedOptions } from "@/lib/filters";
import styles from "./CheckboxGroup.module.css";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Values from the URL may differ in case from the data ("ramen" vs "Ramen"),
// so membership is case-insensitive, matching how filtering works.
// With `collapseAfter`, a long list shows that many options (plus any ticked
// ones) behind a "Show all" button.
export default function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  hideLegend = false,
  collapseAfter,
}: {
  legend: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  hideLegend?: boolean;
  collapseAfter?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = collapseAfter == null ? options : collapsedOptions(options, selected, collapseAfter);
  const canCollapse = collapsed.length < options.length;
  const shown = expanded ? options : collapsed;

  return (
    <fieldset className={styles.group}>
      <legend className={hideLegend ? "visually-hidden" : styles.legend}>{legend}</legend>
      {options.length === 0 && <p className={styles.empty}>None yet</p>}
      <div className={styles.options}>
        {shown.map((option) => {
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
      </div>
      {(canCollapse || expanded) && (
        <button type="button" className={styles.showAll} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer" : `Show all ${options.length}`}
        </button>
      )}
    </fieldset>
  );
}
