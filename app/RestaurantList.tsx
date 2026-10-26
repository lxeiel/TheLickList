"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`restaurant-row-${selectedId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  if (restaurants.length === 0) {
    return <p>No restaurants found</p>;
  }

  return (
    <ul>
      {restaurants.map((restaurant) => (
        <li
          key={restaurant.id}
          id={`restaurant-row-${restaurant.id}`}
          onClick={() => onSelect(restaurant.id)}
          style={{
            background: restaurant.id === selectedId ? "#ffe9a8" : undefined,
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
