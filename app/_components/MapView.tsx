"use client";

import { useEffect, useRef, useState } from "react";
import Map, { AttributionControl, Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { scoreLabel } from "@/lib/format";
import type { Restaurant } from "@/lib/restaurants";
import type { Theme } from "@/lib/theme";
import { readMapColors, recolorMap } from "./mapTheme";
import StatusMark, { STATUS_LABEL } from "./StatusMark";
import styles from "./MapView.module.css";

const FALLBACK_VIEW = { longitude: 103.82, latitude: 1.35, zoom: 10.5 };
const SELECT_ZOOM = 14;

type Located = Restaurant & { lat: number; lng: number };

function pinLabel(r: Restaurant): string {
  return [r.name, STATUS_LABEL[r.status], scoreLabel(r)].filter(Boolean).join(", ");
}

export default function MapView({
  restaurants,
  selectedId,
  onSelect,
  onDeselect,
  theme,
  bottomPadding,
  reducedMotion,
  onUnavailable,
  pinsFocusable = true,
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  theme: Theme;
  bottomPadding: number;
  reducedMotion: boolean;
  onUnavailable: () => void;
  pinsFocusable?: boolean;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const unavailable = !token || failed;

  const located = restaurants.filter((r): r is Located => r.lat != null && r.lng != null);
  const selected = located.find((r) => r.id === selectedId) ?? null;
  const locatedIds = located.map((r) => r.id).join(",");

  useEffect(() => {
    if (unavailable) onUnavailable();
  }, [unavailable, onUnavailable]);

  // Keep the map filling its box as the list panel opens and closes beside it.
  useEffect(() => {
    if (!loaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [loaded]);

  useEffect(() => {
    // Re-fit whenever the set of pinned restaurants changes (a filter or
    // search narrows/widens it), not just once on load — otherwise a
    // filtered-down set can leave pins off-screen. Skip while something's
    // selected so this doesn't fight the selection move below.
    if (!loaded || located.length === 0 || selected) return;
    const lats = located.map((r) => r.lat);
    const lngs = located.map((r) => r.lng);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      // A single point would otherwise fit to max zoom, too close to read.
      { padding: { top: 48, left: 48, right: 48, bottom: 48 + bottomPadding }, duration: 0, maxZoom: SELECT_ZOOM },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, locatedIds, selected, bottomPadding]);

  useEffect(() => {
    if (!loaded || !selected) return;
    // Bottom padding keeps the pin centered in the part of the map the
    // phone sheet doesn't cover.
    const move = {
      center: [selected.lng, selected.lat] as [number, number],
      zoom: SELECT_ZOOM,
      padding: { top: 0, left: 0, right: 0, bottom: bottomPadding },
    };
    if (reducedMotion) mapRef.current?.jumpTo(move);
    else mapRef.current?.flyTo(move);
  }, [loaded, selected, bottomPadding, reducedMotion]);

  if (unavailable) {
    return <div className={styles.unavailable}>Map unavailable</div>;
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={FALLBACK_VIEW}
      mapStyle={theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      onLoad={(e) => {
        const map = e.target;
        recolorMap(map, readMapColors());
        // Fires again after every theme switch swaps the style.
        map.on("style.load", () => recolorMap(map, readMapColors()));
        setLoaded(true);
      }}
      onError={() => {
        // Only a failure before the first load means there's no map at all;
        // later errors are individual tiles.
        if (!loaded) setFailed(true);
      }}
      onClick={(e) => {
        if ((e.originalEvent.target as Element).closest("[data-pin]")) return;
        onDeselect();
      }}
      // Logo and attribution sit at the top: on phones the bottom sheet covers
      // the bottom of the map, and Mapbox requires both to stay visible.
      logoPosition="top-left"
      attributionControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <AttributionControl position="top-right" compact />
      {located.map((r) => (
        <Marker key={r.id} longitude={r.lng} latitude={r.lat}>
          <button
            type="button"
            data-pin
            id={`pin-${r.id}`}
            className={styles.pin}
            data-selected={r.id === selectedId || undefined}
            aria-label={pinLabel(r)}
            tabIndex={pinsFocusable ? undefined : -1}
            onClick={() => onSelect(r.id)}
          >
            <StatusMark status={r.status} size="pin" />
          </button>
        </Marker>
      ))}
      {selected && (
        <Marker longitude={selected.lng} latitude={selected.lat} anchor="bottom" offset={[0, -16]} style={{ pointerEvents: "none" }}>
          <span className={styles.label} aria-hidden>
            {selected.name}
          </span>
        </Marker>
      )}
    </Map>
  );
}
