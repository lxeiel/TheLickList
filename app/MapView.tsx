"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Restaurant } from "@/lib/restaurants";

const FALLBACK_VIEW = { longitude: 0, latitude: 20, zoom: 1.5 };

export default function MapView({
  restaurants,
  selectedId,
  onSelect,
  onDeselect,
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [loaded, setLoaded] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const located = restaurants.filter(
    (r): r is Restaurant & { lat: number; lng: number } => r.lat != null && r.lng != null,
  );
  const selected = located.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!loaded || located.length === 0) return;

    const lats = located.map((r) => r.lat);
    const lngs = located.map((r) => r.lng);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 40, duration: 0 },
    );
    // Only on initial load — later selection changes are handled by the
    // flyTo-on-selection effect below, not by re-fitting the whole set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !selected) return;
    mapRef.current?.flyTo({ center: [selected.lng, selected.lat], zoom: 14 });
  }, [loaded, selected]);

  if (!token) {
    return <p>Map unavailable — missing Mapbox token</p>;
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={FALLBACK_VIEW}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      onLoad={() => setLoaded(true)}
      style={{ width: "100%", height: 400 }}
    >
      {located.map((restaurant) => (
        <Marker
          key={restaurant.id}
          longitude={restaurant.lng}
          latitude={restaurant.lat}
          onClick={() => onSelect(restaurant.id)}
        />
      ))}
      {selected && (
        <Popup
          longitude={selected.lng}
          latitude={selected.lat}
          onClose={onDeselect}
          closeOnClick={false}
        >
          <strong>{selected.name}</strong>
          <br />
          {selected.status}
          {selected.rating != null && ` — ${selected.rating}★`}
          {selected.cuisine_tags.length > 0 && (
            <>
              <br />
              {selected.cuisine_tags.join(", ")}
            </>
          )}
        </Popup>
      )}
    </Map>
  );
}
