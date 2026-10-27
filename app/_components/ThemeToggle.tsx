"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { applyThemePreference, useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  useLayoutEffect(() => {
    if (!document.documentElement.dataset.theme) applyThemePreference();
  }, []);

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
