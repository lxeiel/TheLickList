"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { parseFilters, writeFilters, type Filters } from "@/lib/filters";
import { parseSort, writeSort, type Sort } from "@/lib/sort";

// Writes go through the native History API, which Next syncs into
// useSearchParams without a server round trip — so filtering never refetches
// the restaurant list (see node_modules/next/dist/docs/01-app/01-getting-started/
// 04-linking-and-navigating.md, "Native History API").
function write(next: URLSearchParams, mode: "push" | "replace", state: object | null = null) {
  const query = next.toString();
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  if (mode === "push") window.history.pushState(state, "", url);
  else window.history.replaceState(state, "", url);
}

// Marks a history entry that selectSpot pushed, so closing the detail can
// step back to the entry before it instead of leaving a duplicate behind.
// (Next merges its own router state into whatever object is passed.)
const SPOT_ENTRY = "lickSpot";
const isSpotEntry = () => Boolean((window.history.state as Record<string, unknown> | null)?.[SPOT_ENTRY]);

// Read the live URL at write time rather than a render-time snapshot, so a
// debounced write can't clobber a change made in between.
const current = () => new URLSearchParams(window.location.search);

export function useUrlState() {
  const searchParams = useSearchParams();
  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const filters = useMemo(() => parseFilters(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const spot = params.get("spot");

  const setFilters = useCallback((next: Filters) => write(writeFilters(current(), next), "replace"), []);
  const setSort = useCallback((next: Sort) => write(writeSort(current(), next), "replace"), []);

  // The first selection adds a history entry so the back button deselects;
  // switching between restaurants replaces it rather than stacking entries.
  const selectSpot = useCallback((id: string) => {
    const next = current();
    const hadSpot = next.has("spot");
    next.set("spot", id);
    // Switching keeps whatever the entry already was: a deep-linked spot
    // (unmarked) must never become one that closing steps back from, or
    // closing it would leave the site.
    if (hadSpot) write(next, "replace", { [SPOT_ENTRY]: isSpotEntry() });
    else write(next, "push", { [SPOT_ENTRY]: true });
  }, []);

  const clearSpot = useCallback(() => {
    const next = current();
    if (!next.has("spot")) return;
    if (isSpotEntry()) {
      window.history.back();
      return;
    }
    next.delete("spot");
    write(next, "replace");
  }, []);

  return { params, filters, sort, spot, setFilters, setSort, selectSpot, clearSpot };
}
