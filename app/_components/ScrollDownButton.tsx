"use client";

import { ArrowDown } from "@phosphor-icons/react";
import { scrollToSection } from "./scrollToSection";
import styles from "./ScrollDownButton.module.css";

// Round ↓ button that scrolls to a section on the page; instant when the
// device asks for reduced motion. The label is for screen readers only,
// unless showLabel puts it above the arrow.
export default function ScrollDownButton({
  target,
  label,
  showLabel = false,
}: {
  target: string;
  label: string;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      data-labelled={showLabel || undefined}
      aria-label={showLabel ? undefined : label}
      onClick={() => scrollToSection(target)}
    >
      {showLabel && <span className={styles.label}>{label}</span>}
      <span className={styles.circle}>
        <ArrowDown size={18} aria-hidden />
      </span>
    </button>
  );
}
