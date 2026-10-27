"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyFilters, deriveOptions, EMPTY_FILTERS, findSpot } from "@/lib/filters";
import type { Restaurant } from "@/lib/restaurants";
import DetailHeader from "./DetailHeader";
import FilterBar from "./FilterBar";
import MapView from "./MapView";
import RestaurantDetail from "./RestaurantDetail";
import RestaurantList from "./RestaurantList";
import { PHONE_QUERY, REDUCED_MOTION_QUERY, useMediaQuery } from "./useMediaQuery";
import { useTheme } from "./useTheme";
import { useUrlState } from "./useUrlState";
import styles from "./MapPage.module.css";

type SheetState = "list" | "detail" | "collapsed" | "full";

// Phone sheet heights as a fraction of the viewport; they must match the
// heights in MapPage.module.css so the map can keep pins clear of the sheet.
const SHEET_FRACTION: Record<SheetState, number> = { list: 0.5, detail: 0.6, collapsed: 0.2, full: 1 };
const COLLAPSED_MIN_PX = 120;

export default function MapPage({ restaurants }: { restaurants: Restaurant[] }) {
  const { filters, spot, setFilters, selectSpot, clearSpot } = useUrlState();
  const { theme } = useTheme();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [collapsed, setCollapsed] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  const options = useMemo(() => deriveOptions(restaurants), [restaurants]);
  const filtered = useMemo(() => applyFilters(restaurants, filters), [restaurants, filters]);
  const selected = findSpot(filtered, spot);

  // A selection made from the map should be visible even if the sheet was
  // collapsed.
  const [shownId, setShownId] = useState(selected?.id ?? null);
  if ((selected?.id ?? null) !== shownId) {
    setShownId(selected?.id ?? null);
    if (selected) setCollapsed(false);
  }

  // A shared link to a restaurant that no longer exists, or one the current
  // filters hide, falls back to the list.
  useEffect(() => {
    if (spot && !selected) clearSpot();
  }, [spot, selected, clearSpot]);

  // Opening a restaurant from a list row unmounts that row (the detail
  // replaces the list), which would drop focus to <body>. Move it to the
  // detail's back button instead; a pin keeps focus, since it stays put.
  const pane = useRef<HTMLElement>(null);
  const lastSelectedId = useRef<string | null>(null);
  useEffect(() => {
    const previous = lastSelectedId.current;
    lastSelectedId.current = selected?.id ?? null;
    if (!selected || previous === selected.id) return;
    if (document.activeElement?.closest("[data-pin]")) return;
    pane.current?.querySelector<HTMLElement>("[data-detail-back]")?.focus();
  }, [selected]);

  // After closing the detail, hand focus back to the row (or pin) it came from.
  const returnFocusTo = useRef<string | null>(null);
  useEffect(() => {
    if (selected || !returnFocusTo.current) return;
    const id = returnFocusTo.current;
    returnFocusTo.current = null;
    (document.getElementById(`row-${id}`) ?? document.getElementById(`pin-${id}`))?.focus();
  }, [selected]);

  const deselect = useCallback(() => {
    if (!spot) return;
    returnFocusTo.current = spot;
    clearSpot();
  }, [spot, clearSpot]);

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Leave Esc to open menus, popovers and sheets.
      if ((e.target as Element).closest?.('[role="dialog"], [aria-expanded="true"]')) return;
      deselect();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, deselect]);

  const onUnavailable = useCallback(() => setMapUnavailable(true), []);

  // A shared link that picks a restaurant or filters opens at the map, not
  // the homepage's hero. (A "#map" link is scrolled there by the browser.)
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const hasState = ["spot", "status", "q", "cuisine", "area", "price"].some((key) => url.has(key));
    if (hasState && window.location.hash !== "#map") {
      document.getElementById("map")?.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  const sheet: SheetState = mapUnavailable ? "full" : collapsed ? "collapsed" : selected ? "detail" : "list";
  const bottomPadding = isPhone
    ? Math.round(
        sheet === "collapsed"
          ? Math.max(window.innerHeight * SHEET_FRACTION.collapsed, COLLAPSED_MIN_PX)
          : window.innerHeight * SHEET_FRACTION[sheet],
      )
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <FilterBar variant="map" filters={filters} options={options} onChange={setFilters} />
      </div>

      <div className={styles.body}>
        <div className={styles.map}>
          <MapView
            restaurants={filtered}
            selectedId={selected?.id ?? null}
            onSelect={selectSpot}
            onDeselect={deselect}
            theme={theme}
            bottomPadding={bottomPadding}
            reducedMotion={reducedMotion}
            onUnavailable={onUnavailable}
            // On phones the sheet covers part of the map, so keyboard focus
            // could land on a hidden pin; the list rows do the same job.
            pinsFocusable={!isPhone}
          />
        </div>

        <section ref={pane} id="content" className={styles.pane} data-sheet={sheet} aria-label="Restaurants">
          {!mapUnavailable && (
            <button
              type="button"
              className={styles.handle}
              aria-label={collapsed ? "Expand list" : "Collapse list"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              <span aria-hidden />
            </button>
          )}
          {selected ? (
            <div className={styles.detail}>
              <DetailHeader onBack={deselect} onClose={deselect} />
              <RestaurantDetail restaurant={selected} />
            </div>
          ) : (
            <RestaurantList
              restaurants={filtered}
              selectedId={null}
              onSelect={selectSpot}
              total={restaurants.length}
              onClearFilters={() => setFilters(EMPTY_FILTERS)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
