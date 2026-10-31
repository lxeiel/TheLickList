"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { activeFilterCount, applyFilters, deriveOptions, EMPTY_FILTERS, findSpot } from "@/lib/filters";
import type { Restaurant } from "@/lib/restaurants";
import type { SheetSize } from "@/lib/sheet";
import { sortRestaurants } from "@/lib/sort";
import DetailHeader from "./DetailHeader";
import FilterBar from "./FilterBar";
import MapView from "./MapView";
import RestaurantDetail from "./RestaurantDetail";
import RestaurantList from "./RestaurantList";
import { useSheetDrag } from "./useSheetDrag";
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
  const { filters, sort, spot, setFilters, setSort, selectSpot, clearSpot } = useUrlState();
  const { theme } = useTheme();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  // The phone sheet's size, as the visitor last dragged or tapped it.
  const [size, setSize] = useState<SheetSize>("default");
  const [mapUnavailable, setMapUnavailable] = useState(false);
  // Phones: typing in the sheet's search box opens the sheet to full height,
  // so the keyboard doesn't hide the results.
  const [searching, setSearching] = useState(false);
  const searchBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Desktop list panel: docked on the left; the visitor can collapse it.
  const [listClosedByUser, setListClosedByUser] = useState(false);
  const listOpen = !listClosedByUser;

  const options = useMemo(() => deriveOptions(restaurants), [restaurants]);
  const filtered = useMemo(() => applyFilters(restaurants, filters), [restaurants, filters]);
  // The sort only orders the list; the map shows the same pins either way.
  const listed = useMemo(() => sortRestaurants(filtered, sort), [filtered, sort]);
  const selected = findSpot(filtered, spot);
  const hasActiveFilters =
    filters.status !== "all" || filters.q !== "" || activeFilterCount(filters) > 0;

  // A selection made from the map should be visible even if the sheet was
  // collapsed, and the map beside it even if the sheet was pulled to full.
  const [shownId, setShownId] = useState(selected?.id ?? null);
  if ((selected?.id ?? null) !== shownId) {
    setShownId(selected?.id ?? null);
    if (selected) {
      // The detail replaces the search box, which unmounts without a blur.
      setSearching(false);
      setSize("default");
      setListClosedByUser(false);
    }
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
      // Leave Esc to open menus, popovers, sheets and native <dialog>s (the
      // photo viewer), which close themselves.
      if ((e.target as Element).closest?.('dialog, [role="dialog"], [aria-expanded="true"]')) return;
      deselect();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, deselect]);

  const onUnavailable = useCallback(() => setMapUnavailable(true), []);

  // A shared link that picks a restaurant or filters opens at the map, not
  // the homepage's hero. So does a "#map" link: navigating from another page
  // shows the loading screen first, so Next's own scroll to #map runs before
  // the map exists and finds nothing.
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const hasState = ["spot", "status", "q", "cuisine", "area", "price"].some((key) => url.has(key));
    if (hasState || window.location.hash === "#map") {
      document.getElementById("map")?.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  const sheet: SheetState =
    mapUnavailable || searching || size === "full"
      ? "full"
      : size === "collapsed"
        ? "collapsed"
        : selected
          ? "detail"
          : "list";
  // A full sheet hides the map; fit the pins for the height it comes back
  // down to (a full-height padding would leave Mapbox no room to fit them).
  const paddingSheet: SheetState =
    sheet === "full" && !mapUnavailable ? (size === "collapsed" ? "collapsed" : selected ? "detail" : "list") : sheet;

  const handle = useSheetDrag({
    pane,
    size,
    getSnaps: () => ({
      collapsed: Math.max(window.innerHeight * SHEET_FRACTION.collapsed, COLLAPSED_MIN_PX),
      default: window.innerHeight * SHEET_FRACTION[selected ? "detail" : "list"],
      full: pane.current?.parentElement?.clientHeight ?? window.innerHeight,
    }),
    onChange: setSize,
  });
  const bottomPadding = isPhone
    ? Math.round(
        paddingSheet === "collapsed"
          ? Math.max(window.innerHeight * SHEET_FRACTION.collapsed, COLLAPSED_MIN_PX)
          : window.innerHeight * SHEET_FRACTION[paddingSheet],
      )
    : 0;

  // Leaving the search box shrinks the sheet back a moment later, so a tap on
  // a result lands before the list moves under the finger. Only the search
  // box counts: the Filters sheet's checkboxes are portalled out of the DOM
  // but their focus events still bubble here through React.
  const isSearchBox = (target: EventTarget) => target instanceof HTMLInputElement && target.type === "search";
  function onSearchFocus(e: React.FocusEvent) {
    if (!isSearchBox(e.target)) return;
    if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
    setSearching(true);
  }
  function onSearchBlur(e: React.FocusEvent) {
    if (!isSearchBox(e.target)) return;
    if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
    searchBlurTimer.current = setTimeout(() => setSearching(false), 200);
  }
  // The keyboard's Search/Enter key puts the keyboard away to show the map.
  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && isSearchBox(e.target)) (e.target as HTMLInputElement).blur();
  }
  useEffect(() => () => {
    if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
  }, []);

  return (
    <div className={styles.page}>
      {/* On phones the search and filters sit at the top of the sheet
          instead, leaving the map more room. */}
      {!isPhone && (
        <div className={styles.filters}>
          <FilterBar variant="map" filters={filters} options={options} onChange={setFilters} />
        </div>
      )}

      <div className={styles.body} data-list={listOpen ? "open" : "closed"}>
        <section
          ref={pane}
          id="content"
          className={styles.pane}
          data-sheet={sheet}
          aria-label="Restaurants"
          inert={!isPhone && !listOpen}
        >
          {!mapUnavailable && (
            <button
              type="button"
              className={styles.handle}
              aria-label={size === "collapsed" ? "Expand list" : size === "full" ? "Shrink list" : "Collapse list"}
              aria-expanded={size !== "collapsed"}
              {...handle}
            >
              <span aria-hidden />
            </button>
          )}
          {isPhone && !selected && (
            <div className={styles.sheetFilters} onFocus={onSearchFocus} onBlur={onSearchBlur} onKeyDown={onSearchKeyDown}>
              <FilterBar
                variant="map"
                filters={filters}
                options={options}
                onChange={setFilters}
                sort={listed.length > 1 ? sort : undefined}
                onSortChange={listed.length > 1 ? setSort : undefined}
              />
            </div>
          )}
          {selected ? (
            <div className={styles.detail}>
              <DetailHeader onBack={deselect} onClose={deselect} />
              <RestaurantDetail restaurant={selected} />
            </div>
          ) : (
            <RestaurantList
              restaurants={listed}
              selectedId={null}
              onSelect={selectSpot}
              total={restaurants.length}
              onClearFilters={() => setFilters(EMPTY_FILTERS)}
              // On phones the sort sits beside Filters + in the sheet's header.
              sort={isPhone ? undefined : sort}
              onSortChange={isPhone ? undefined : setSort}
            />
          )}
        </section>

        <div className={styles.map}>
          {!isPhone && (
            <button
              type="button"
              className={styles.listToggle}
              aria-controls="content"
              aria-expanded={listOpen}
              aria-label={listOpen ? "Hide list" : "Show list"}
              onClick={() => setListClosedByUser(listOpen)}
            >
              {listOpen ? <CaretLeft size={16} aria-hidden /> : <CaretRight size={16} aria-hidden />}
            </button>
          )}
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
            // A plain visit opens on the home view of Singapore; a link that
            // arrives already filtered opens on its results.
            fitOnLoad={hasActiveFilters}
          />
        </div>

      </div>
    </div>
  );
}
