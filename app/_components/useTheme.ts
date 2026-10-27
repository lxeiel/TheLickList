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

export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the theme still applies for this page view.
    }
  }, []);

  return { theme, setTheme };
}
