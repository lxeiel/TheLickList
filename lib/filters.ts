import type { Restaurant, RestaurantStatus } from "./restaurants";

export type StatusFilter = "all" | RestaurantStatus;

export type Filters = {
  status: StatusFilter;
  q: string;
  cuisine: string[];
  area: string[];
  price: string[];
  /** Only Licked spots scored at least this (7, 8 or 9); null for any. */
  minScore: number | null;
};

export const MIN_SCORES = [7, 8, 9] as const;

export const EMPTY_FILTERS: Filters = { status: "all", q: "", cuisine: [], area: [], price: [], minScore: null };

export const FILTER_KEYS = ["status", "q", "cuisine", "area", "price", "score"] as const;

export type FilterOptions = { cuisine: string[]; area: string[]; price: string[] };

export function parseFilters(params: URLSearchParams): Filters {
  const status = params.get("status");
  return {
    status: status === "tried" || status === "wishlist" ? status : "all",
    q: params.get("q") ?? "",
    cuisine: params.getAll("cuisine"),
    area: params.getAll("area"),
    price: params.getAll("price"),
    minScore: MIN_SCORES.find((score) => String(score) === params.get("score")) ?? null,
  };
}

// Replaces only the filter keys, leaving spot/sort/dir (and anything else)
// where they were; defaults are omitted so a clean view has a clean URL.
export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const out = new URLSearchParams(params.toString());
  for (const key of FILTER_KEYS) out.delete(key);
  if (filters.status !== "all") out.set("status", filters.status);
  if (filters.q) out.set("q", filters.q);
  for (const value of filters.cuisine) out.append("cuisine", value);
  for (const value of filters.area) out.append("area", value);
  for (const value of filters.price) out.append("price", value);
  if (filters.minScore != null) out.set("score", String(filters.minScore));
  return out;
}

const lower = (s: string) => s.toLowerCase();

export function applyFilters(restaurants: Restaurant[], filters: Filters): Restaurant[] {
  const q = lower(filters.q.trim());
  const cuisine = filters.cuisine.map(lower);
  const area = filters.area.map(lower);

  return restaurants.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false;
    // Gotta Lick and unrated spots have no score, so a minimum hides them.
    if (filters.minScore != null && (r.status !== "tried" || r.rating == null || r.rating < filters.minScore)) {
      return false;
    }
    if (cuisine.length > 0 && !r.cuisine_tags.some((tag) => cuisine.includes(lower(tag)))) return false;
    if (area.length > 0 && (r.area == null || !area.includes(lower(r.area)))) return false;
    if (filters.price.length > 0 && (r.price_range == null || !filters.price.includes(r.price_range))) {
      return false;
    }
    if (q === "") return true;
    return (
      lower(r.name).includes(q) ||
      r.cuisine_tags.some((tag) => lower(tag).includes(q)) ||
      (r.area != null && lower(r.area).includes(q)) ||
      r.foods.some((food) => lower(food.name).includes(q))
    );
  });
}

function uniqueCaseInsensitive(values: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !seen.has(lower(trimmed))) seen.set(lower(trimmed), trimmed);
  }
  return [...seen.values()];
}

const byName = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

export function deriveOptions(restaurants: Restaurant[]): FilterOptions {
  return {
    cuisine: uniqueCaseInsensitive(restaurants.flatMap((r) => r.cuisine_tags)).sort(byName),
    area: uniqueCaseInsensitive(restaurants.map((r) => r.area)).sort(byName),
    // "$" before "$$" before "$$$": shortest first.
    price: uniqueCaseInsensitive(restaurants.map((r) => r.price_range)).sort(
      (a, b) => a.length - b.length || byName(a, b),
    ),
  };
}

// A long group shows only its first `limit` options until expanded, plus any
// ticked ones past the cut so a choice never hides.
export function collapsedOptions(options: string[], selected: string[], limit: number): string[] {
  const ticked = selected.map(lower);
  return options.filter((option, i) => i < limit || ticked.includes(lower(option)));
}

// The Filters menu's Clear: empties what's set inside it, leaving the status
// tabs and the search alone.
export function clearMenuFilters(filters: Filters): Filters {
  return { ...filters, cuisine: [], area: [], price: [], minScore: null };
}

export function activeFilterCount(filters: Filters): number {
  return filters.cuisine.length + filters.area.length + filters.price.length + (filters.minScore != null ? 1 : 0);
}

export function findSpot(restaurants: Restaurant[], id: string | null): Restaurant | null {
  if (id == null) return null;
  return restaurants.find((r) => r.id === id) ?? null;
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function onlyFilters(params: URLSearchParams): URLSearchParams {
  return writeFilters(new URLSearchParams(), parseFilters(params));
}

// The sort (sort/dir) travels with the filters between the map list and the
// List page.
function withSort(out: URLSearchParams, params: URLSearchParams): URLSearchParams {
  for (const key of ["sort", "dir"]) {
    const value = params.get(key);
    if (value) out.set(key, value);
  }
  return out;
}

export function mapHref(params: URLSearchParams, spotId?: string): string {
  const out = withSort(onlyFilters(params), params);
  if (spotId) out.set("spot", spotId);
  return withQuery("/", out);
}

export function listHref(params: URLSearchParams): string {
  return withQuery("/list", withSort(onlyFilters(params), params));
}
