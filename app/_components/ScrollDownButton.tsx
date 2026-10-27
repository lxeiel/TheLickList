"use client";

import { ArrowDown } from "@phosphor-icons/react";
import styles from "./ScrollDownButton.module.css";

// Round ↓ button that scrolls to a section on the page; instant when the
// device asks for reduced motion.
export default function ScrollDownButton({ target, label }: { target: string; label: string }) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById(target)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      }}
    >
      <span className={styles.circle}>
        <ArrowDown size={18} aria-hidden />
      </span>
      {label}
    </button>
  );
}
