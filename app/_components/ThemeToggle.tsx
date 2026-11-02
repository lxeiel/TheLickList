"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { applyThemePreference, useTheme, type ThemeOrigin } from "./useTheme";
import styles from "./ThemeToggle.module.css";

// The theme's circle reveal grows from the tap, or from the button's
// centre when it was pressed from the keyboard (no pointer position).
function originOf(e: React.MouseEvent<HTMLButtonElement>): ThemeOrigin {
  if (e.detail > 0) return { x: e.clientX, y: e.clientY };
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// "icon": the ☾/☀ button in the navbar. "row": a full-width "Night mode"
// row for the phone menu, showing whether it's on.
export default function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => setTheme(next, originOf(e));

  useLayoutEffect(() => {
    if (!document.documentElement.dataset.theme) applyThemePreference();
  }, []);

  if (variant === "row") {
    return (
      <button type="button" className={styles.row} aria-pressed={theme === "dark"} onClick={toggle}>
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
      onClick={toggle}
      aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {/* Both icons render; CSS picks one from <html data-theme>, so the
          right icon shows on first paint, before React hydrates. */}
      <Moon className={styles.moon} size={20} aria-hidden />
      <Sun className={styles.sun} size={20} aria-hidden />
    </button>
  );
}
