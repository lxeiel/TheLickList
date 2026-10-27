import type { Restaurant, RestaurantStatus } from "./restaurants";

export type StatusFilter = "all" | RestaurantStatus;

export type Filters = {
  status: StatusFilter;
  q: string;
  cuisine: string[];
  area: string[];
  price: string[];
};

export const EMPTY_FILTERS: Filters = { status: "all", q: "", cuisine: [], area: [], price: [] };

export const FILTER_KEYS = ["status", "q", "cuisine", "area", "price"] as const;

export type FilterOptions = { cuisine: string[]; area: string[]; price: string[] };

export function parseFilters(params: URLSearchParams): Filters {
  const status = params.get("status");
  return {
    status: status === "tried" || status === "wishlist" ? status : "all",
    q: params.get("q") ?? "",
    cuisine: params.getAll("cuisine"),
    area: params.getAll("area"),
    price: params.getAll("price"),
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
  return out;
}

const lower = (s: string) => s.toLowerCase();

export function applyFilters(restaurants: Restaurant[], filters: Filters): Restaurant[] {
  const q = lower(filters.q.trim());
  const cuisine = filters.cuisine.map(lower);
  const area = filters.area.map(lower);

  return restaurants.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false;
    if (cuisine.length > 0 && !r.cuisine_tags.some((tag) => cuisine.includes(lower(tag)))) return false;
    if (area.length > 0 && (r.area == null || !area.includes(lower(r.area)))) return false;
    if (filters.price.length > 0 && (r.price_range == null || !filters.price.includes(r.price_range))) {
      return false;
    }
    if (q === "") return true;
    return (
      lower(r.name).includes(q) ||
      r.cuisine_tags.some((tag) => lower(tag).includes(q)) ||
      (r.area != null && lower(r.area).includes(q))
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

export function activeFilterCount(filters: Filters): number {
  return filters.cuisine.length + filters.area.length + filters.price.length;
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

export function mapHref(params: URLSearchParams, spotId?: string): string {
  const out = onlyFilters(params);
  if (spotId) out.set("spot", spotId);
  return withQuery("/", out);
}

export function listHref(params: URLSearchParams): string {
  const out = onlyFilters(params);
  for (const key of ["sort", "dir"]) {
    const value = params.get(key);
    if (value) out.set(key, value);
  }
  return withQuery("/list", out);
}
