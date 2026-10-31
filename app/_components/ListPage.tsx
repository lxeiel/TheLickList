"use client";

import { useEffect, useMemo, useState } from "react";
import { applyFilters, deriveOptions, EMPTY_FILTERS, findSpot, mapHref } from "@/lib/filters";
import type { Restaurant } from "@/lib/restaurants";
import { sortRestaurants } from "@/lib/sort";
import DetailHeader from "./DetailHeader";
import EmptyState from "./EmptyState";
import FilterBar from "./FilterBar";
import RestaurantDetail from "./RestaurantDetail";
import RestaurantRow from "./RestaurantRow";
import RestaurantTable from "./RestaurantTable";
import Sheet from "./Sheet";
import { useUrlState } from "./useUrlState";
import styles from "./ListPage.module.css";

const restaurantCount = (n: number) => (n === 1 ? "1 restaurant" : `${n} restaurants`);

export default function ListPage({ restaurants }: { restaurants: Restaurant[] }) {
  const { params, filters, sort, spot, setFilters, setSort, selectSpot, clearSpot } = useUrlState();

  const options = useMemo(() => deriveOptions(restaurants), [restaurants]);
  const filtered = useMemo(() => applyFilters(restaurants, filters), [restaurants, filters]);
  const sorted = useMemo(() => sortRestaurants(filtered, sort), [filtered, sort]);
  const selected = findSpot(filtered, spot);

  // Keep showing the last restaurant while the drawer animates closed.
  const [shown, setShown] = useState(selected);
  if (selected && selected !== shown) setShown(selected);

  // A shared link to a restaurant that no longer exists, or one the current
  // filters hide, falls back to the list.
  useEffect(() => {
    if (spot && !selected) clearSpot();
  }, [spot, selected, clearSpot]);

  return (
    <main id="content" className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>All spots</h1>
        <span className={styles.count} aria-live="polite">
          {restaurantCount(sorted.length)}
        </span>
      </header>

      <FilterBar
        variant="list"
        filters={filters}
        options={options}
        onChange={setFilters}
        sort={sort}
        onSortChange={setSort}
      />

      <div className={styles.results}>
        {sorted.length === 0 ? (
          <EmptyState
            kind={restaurants.length === 0 ? "no-data" : "no-matches"}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        ) : (
          <>
            {/* Both layouts render; CSS shows one per breakpoint so the server
                render already matches the device. */}
            <div className={styles.desktop}>
              <RestaurantTable
                restaurants={sorted}
                sort={sort}
                onSortChange={setSort}
                selectedId={selected?.id ?? null}
                onSelect={selectSpot}
              />
            </div>
            <ul className={styles.phone}>
              {sorted.map((r) => (
                <li key={r.id}>
                  <RestaurantRow restaurant={r} selected={r.id === selected?.id} onSelect={selectSpot} showPrice={false} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Sheet
        open={selected != null}
        onClose={clearSpot}
        label={shown?.name ?? "Restaurant"}
        placement="popup"
        height="85%"
      >
        {shown && (
          <>
            <DetailHeader onBack={clearSpot} onClose={clearSpot} backOnPhoneOnly />
            <RestaurantDetail
              restaurant={shown}
              layout="popup"
              showOnMapHref={shown.lat != null ? mapHref(params, shown.id) : undefined}
            />
          </>
        )}
      </Sheet>
    </main>
  );
}
