"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

// The theme lives on <html data-theme>, set before paint by the inline theme
// script. Watching the attribute keeps every subscriber (toggle, map) in sync.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

// Same decision as the inline theme script. Re-applied after mount because in
// development Strict Mode's remount resets <html> attributes, clearing the
// one the script set.
export function applyThemePreference() {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked: day mode.
  }
  document.documentElement.dataset.theme = stored === "dark" ? "dark" : "light";
}

// The map fires this once its new style has loaded and been recolored, so a
// theme switch can wait for it rather than animate to a blank map.
export const MAP_RESTYLED_EVENT = "lick:map-restyled";
const MAP_WAIT_MS = 1000;

function mapRestyled(): Promise<void> {
  if (!document.querySelector(".mapboxgl-map")) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener(MAP_RESTYLED_EVENT, done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, MAP_WAIT_MS);
    window.addEventListener(MAP_RESTYLED_EVENT, done);
  });
}

const CIRCLE_MS = 500;

/** Where the switch was tapped; the circle reveal grows from here. */
export type ThemeOrigin = { x: number; y: number };

export function useTheme(): { theme: Theme; setTheme: (theme: Theme, origin?: ThemeOrigin) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme, origin?: ThemeOrigin) => {
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = next;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage blocked: the theme still applies for this page view.
      }
    };

    // The browser snapshots the page, switches the theme behind the
    // snapshot, then reveals the new theme in a circle growing from the
    // tap, so the whole page changes as one. Without View Transitions, or
    // with reduced motion, the switch stays instant.
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    root.dataset.themeSwitching = "";
    const transition = document.startViewTransition(async () => {
      apply();
      await mapRestyled();
    });
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? 0;
    // Far enough to cover the farthest corner from the tap.
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: CIRCLE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
    transition.finished.finally(() => delete root.dataset.themeSwitching);
  }, []);

  return { theme, setTheme };
}
