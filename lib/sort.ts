import type { Restaurant } from "./restaurants";

export type SortKey = "added" | "rating" | "name";
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

export const NATURAL_DIR: Record<SortKey, SortDir> = { added: "desc", rating: "desc", name: "asc" };

const isKey = (value: string | null): value is SortKey =>
  value === "added" || value === "rating" || value === "name";
const isDir = (value: string | null): value is SortDir => value === "asc" || value === "desc";

export function parseSort(params: URLSearchParams): Sort {
  const raw = params.get("sort");
  const key = isKey(raw) ? raw : "added";
  const dir = params.get("dir");
  // No `sort` means the default key ("added"), and writeSort omits it — so a
  // lone `dir` still applies. Only an unknown `sort` discards `dir`.
  const dirApplies = raw == null || isKey(raw);
  return { key, dir: dirApplies && isDir(dir) ? dir : NATURAL_DIR[key] };
}

export function writeSort(params: URLSearchParams, sort: Sort): URLSearchParams {
  const out = new URLSearchParams(params.toString());
  out.delete("sort");
  out.delete("dir");
  if (sort.key !== "added") out.set("sort", sort.key);
  if (sort.dir !== NATURAL_DIR[sort.key]) out.set("dir", sort.dir);
  return out;
}

export function toggleSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: NATURAL_DIR[key] };
}

const byName = (a: Restaurant, b: Restaurant) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

// A wishlist entry or an unrated one has no score to rank by.
const scoreOf = (r: Restaurant) => (r.status === "wishlist" ? null : r.rating);

export function sortRestaurants(list: Restaurant[], sort: Sort): Restaurant[] {
  const sign = sort.dir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    if (sort.key === "rating") {
      const sa = scoreOf(a);
      const sb = scoreOf(b);
      // Unscored stay at the bottom whichever way the column is sorted.
      if (sa == null || sb == null) {
        if (sa == null && sb == null) return byName(a, b);
        return sa == null ? 1 : -1;
      }
      return (sa - sb) * sign || byName(a, b);
    }
    if (sort.key === "added") {
      return (Date.parse(a.created_at) - Date.parse(b.created_at)) * sign || byName(a, b);
    }
    return byName(a, b) * sign;
  });
}
