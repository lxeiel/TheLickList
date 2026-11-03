export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "lick-theme";

// Runs inline in <head> before first paint so the page never flashes the
// wrong theme. Kept as plain ES5 source: it is not bundled or transpiled.
// The site opens in day (light) mode whatever the device is set to; only the
// visitor's own choice on the toggle, once stored, changes that. Storage can
// throw (private mode, blocked site data), in which case it's day.
export const themeScript = `(function () {
  var stored = null;
  try { stored = window.localStorage.getItem("${THEME_STORAGE_KEY}"); } catch (e) {}
  document.documentElement.dataset.theme = stored === "dark" ? "dark" : "light";
})();`;
