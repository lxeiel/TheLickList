"use client";

import { useEffect, useRef } from "react";
import type { Restaurant } from "@/lib/restaurants";

export default function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const container = listRef.current;
    const row = selectedId ? document.getElementById(`restaurant-row-${selectedId}`) : null;
    if (!container || !row) return;

    // Scroll only this list's own box, never the page — native
    // scrollIntoView({block:"nearest"}) can still move an outer scroll
    // ancestor (here, the window) even after the nearer one is fully
    // scrolled, which can push the map above the fold.
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (rowTop < viewTop) {
      container.scrollTo({ top: rowTop, behavior: "smooth" });
    } else if (rowBottom > viewBottom) {
      container.scrollTo({ top: rowBottom - container.clientHeight, behavior: "smooth" });
    }
  }, [selectedId]);

  if (restaurants.length === 0) {
    return <p>No restaurants found</p>;
  }

  return (
    // Bounded so scrollIntoView (above) scrolls this list rather than the
    // whole page — otherwise selecting a row far down scrolls the map
    // itself (and whatever popup it just opened) out of the viewport.
    <ul ref={listRef} style={{ maxHeight: 400, overflowY: "auto" }}>
      {restaurants.map((restaurant) => (
        <li
          key={restaurant.id}
          id={`restaurant-row-${restaurant.id}`}
          onClick={() => onSelect(restaurant.id)}
          style={{
            background: restaurant.id === selectedId ? "#ffe9a8" : undefined,
            // The highlight background is always pale yellow regardless of
            // the page's dark-mode theme, so pin a readable text color
            // rather than inheriting the (light, in dark mode) foreground.
            color: restaurant.id === selectedId ? "#171717" : undefined,
            cursor: "pointer",
          }}
        >
          <strong>{restaurant.name}</strong> — {restaurant.status}
          {restaurant.rating != null && ` — ${restaurant.rating}★`}
          {restaurant.cuisine_tags.length > 0 && ` — ${restaurant.cuisine_tags.join(", ")}`}
          {restaurant.lat == null && " — no location set"}
        </li>
      ))}
    </ul>
  );
}
