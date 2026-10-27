export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "lick-theme";

// Runs inline in <head> before first paint so the page never flashes the
// wrong theme. Kept as plain ES5 source: it is not bundled or transpiled.
// Storage can throw (private mode, blocked site data), in which case the
// device setting decides.
export const themeScript = `(function () {
  var stored = null;
  try { stored = window.localStorage.getItem("${THEME_STORAGE_KEY}"); } catch (e) {}
  var theme = stored === "light" || stored === "dark"
    ? stored
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
})();`;
