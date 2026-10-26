"use client";

import { useEffect, useState } from "react";
import MapView from "@/app/MapView";
import RestaurantList from "@/app/RestaurantList";
import type { Restaurant, RestaurantStatus } from "@/lib/restaurants";

export default function HomeClient({ restaurants }: { restaurants: Restaurant[] }) {
  const [status, setStatus] = useState<"all" | RestaurantStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = restaurants.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (query === "" ||
        r.name.toLowerCase().includes(query) ||
        r.cuisine_tags.some((tag) => tag.toLowerCase().includes(query))),
  );
  // If the selected restaurant gets filtered out, actually clear the
  // selection state (not just what's passed down) — otherwise widening the
  // filter again later resurrects a stale selection and flies back to a
  // restaurant the user never re-selected.
  useEffect(() => {
    if (selectedId && !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  });

  return (
    <main>
      <h1>The Lick List</h1>

      <div>
        <button onClick={() => setStatus("all")} disabled={status === "all"}>
          Both
        </button>
        <button onClick={() => setStatus("wishlist")} disabled={status === "wishlist"}>
          Want to Try
        </button>
        <button onClick={() => setStatus("tried")} disabled={status === "tried"}>
          Tried
        </button>
        <input
          type="text"
          placeholder="Search name or cuisine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <MapView
        restaurants={filtered}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onDeselect={() => setSelectedId(null)}
      />
      <RestaurantList restaurants={filtered} selectedId={selectedId} onSelect={setSelectedId} />
    </main>
  );
}
