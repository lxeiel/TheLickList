"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { applyThemePreference, useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

// "icon": the ☾/☀ button in the navbar. "row": a full-width "Night mode"
// row for the phone menu, showing whether it's on.
export default function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  useLayoutEffect(() => {
    if (!document.documentElement.dataset.theme) applyThemePreference();
  }, []);

  if (variant === "row") {
    return (
      <button type="button" className={styles.row} aria-pressed={theme === "dark"} onClick={() => setTheme(next)}>
        Night mode
        <span className={styles.rowState}>
          {theme === "dark" ? "On" : "Off"}
          <Moon className={styles.moon} size={20} aria-hidden />
          <Sun className={styles.sun} size={20} aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {/* Both icons render; CSS picks one from <html data-theme>, so the
          right icon shows on first paint, before React hydrates. */}
      <Moon className={styles.moon} size={20} aria-hidden />
      <Sun className={styles.sun} size={20} aria-hidden />
    </button>
  );
}
