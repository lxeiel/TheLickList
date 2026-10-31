import type { Restaurant } from "./restaurants";

// status, area and price are only offered as List table headers.
export type SortKey = "added" | "rating" | "name" | "status" | "area" | "price";
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

export const DEFAULT_SORT: Sort = { key: "added", dir: "desc" };

// The sort menu's choices (List page on phones, and the map list).
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "added", label: "Newest added" },
  { value: "rating", label: "Highest score" },
  { value: "name", label: "A–Z" },
];

// Shown in the sort menu only when a table header (or a shared link) picked
// one of the table-only keys, so the menu never names the wrong sort.
export const TABLE_SORT_LABEL: Record<"status" | "area" | "price", string> = {
  status: "Status",
  area: "Area",
  price: "Price",
};

export const NATURAL_DIR: Record<SortKey, SortDir> = {
  added: "desc",
  rating: "desc",
  name: "asc",
  status: "asc",
  area: "asc",
  price: "asc",
};

// The List page's removable sort chip, e.g. "Price, cheapest first": the
// column, then the natural direction's wording or the flipped one's. Null for
// the default sort, which needs no chip.
const CHIP_COLUMN: Record<SortKey, string> = {
  added: "Added",
  rating: "Score",
  name: "Name",
  status: "Status",
  area: "Area",
  price: "Price",
};
const CHIP_ORDER: Record<SortKey, [natural: string, flipped: string]> = {
  added: ["newest first", "oldest first"],
  rating: ["highest first", "lowest first"],
  name: ["A–Z", "Z–A"],
  status: ["Licked first", "Gotta Lick first"],
  area: ["A–Z", "Z–A"],
  price: ["cheapest first", "priciest first"],
};

export function sortChipLabel(sort: Sort): string | null {
  if (sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir) return null;
  const [natural, flipped] = CHIP_ORDER[sort.key];
  return `${CHIP_COLUMN[sort.key]}, ${sort.dir === NATURAL_DIR[sort.key] ? natural : flipped}`;
}

const isKey = (value: string | null): value is SortKey => value != null && Object.hasOwn(NATURAL_DIR, value);
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

// Licked before Gotta Lick when ascending.
const STATUS_RANK = { tried: 0, wishlist: 1 } as const;

// "$" before "$$" before "$$$": shortest first, as in the price filter.
const comparePrice = (a: string, b: string) => a.length - b.length || a.localeCompare(b);
const compareText = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

// Blank values stay at the bottom whichever way the column is sorted; ties
// (and blanks among themselves) fall back to name A–Z.
function blanksLast<T>(
  a: Restaurant,
  b: Restaurant,
  va: T | null,
  vb: T | null,
  compare: (x: T, y: T) => number,
  sign: number,
): number {
  if (va == null || vb == null) {
    if (va == null && vb == null) return byName(a, b);
    return va == null ? 1 : -1;
  }
  return compare(va, vb) * sign || byName(a, b);
}

const blank = (value: string | null) => (value?.trim() ? value : null);

export function sortRestaurants(list: Restaurant[], sort: Sort): Restaurant[] {
  const sign = sort.dir === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    switch (sort.key) {
      case "rating":
        return blanksLast(a, b, scoreOf(a), scoreOf(b), (x, y) => x - y, sign);
      case "added":
        return (Date.parse(a.created_at) - Date.parse(b.created_at)) * sign || byName(a, b);
      case "status":
        return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * sign || byName(a, b);
      case "area":
        return blanksLast(a, b, blank(a.area), blank(b.area), compareText, sign);
      case "price":
        return blanksLast(a, b, blank(a.price_range), blank(b.price_range), comparePrice, sign);
      case "name":
        return byName(a, b) * sign;
    }
  });
}
