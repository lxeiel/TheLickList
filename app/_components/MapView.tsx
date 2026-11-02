"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CircleNotch, DiceFive, ForkKnife, NavigationArrow } from "@phosphor-icons/react";
import Map, { AttributionControl, Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { scoreLabel } from "@/lib/format";
import { sortByDistance, type Point } from "@/lib/geo";
import type { Restaurant } from "@/lib/restaurants";
import type { Theme } from "@/lib/theme";
import { readMapColors, recolorMap } from "./mapTheme";
import StatusMark, { STATUS_LABEL } from "./StatusMark";
import { MAP_RESTYLED_EVENT } from "./useTheme";
import styles from "./MapView.module.css";

// Every visit opens on this view of Singapore. Framed as an area rather than
// a centre + zoom so it looks the same on a phone and a wide screen. On
// phones it's framed in the part of the map above the bottom sheet.
const HOME_BOUNDS: [[number, number], [number, number]] = [
  [103.62, 1.22],
  [104.03, 1.47],
];
const SELECT_ZOOM = 14;

type Located = Restaurant & { lat: number; lng: number };

/** A tap of one of the map's location buttons: "me" centers on the visitor,
    "nearest" frames them with their nearest pin. `n` goes up on every tap. */
export type LocateFrame = "me" | "nearest";
export type LocateRequest = { n: number; frame: LocateFrame };

function pinLabel(r: Restaurant): string {
  return [r.name, STATUS_LABEL[r.status], scoreLabel(r)].filter(Boolean).join(", ");
}

type MapViewProps = Parameters<typeof LiveMap>[0];

// Next keeps a page you've left alive but hidden (React's <Activity>), and
// react-map-gl can't survive that: hiding destroys the Mapbox map, then on
// return the pins try to attach to the destroyed map and crash before the map
// rebuilds. So the map only exists while the page is shown, and comes back
// fresh each time.
export default function MapView(props: MapViewProps) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(true);
    return () => setShown(false);
  }, []);
  return shown ? <LiveMap {...props} /> : null;
}

function LiveMap({
  restaurants,
  selectedId,
  onSelect,
  onDeselect,
  theme,
  bottomPadding,
  reducedMotion,
  onUnavailable,
  pinsFocusable = true,
  fitOnLoad = false,
  here = null,
  locating = false,
  locateRequest = null,
  onLocate,
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
  /** Fit to the pins on load instead of opening on the home view. */
  fitOnLoad?: boolean;
  /** The visitor's location, once they've shared it. */
  here?: Point | null;
  locating?: boolean;
  /** The latest tap of a location button; the map moves once `here` is
      known for it. */
  locateRequest?: LocateRequest | null;
  onLocate?: (frame: LocateFrame) => void;
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

  // The buttons' labels introduce them, then fade 10 seconds after the map
  // comes into view (it sits below the homepage's hero), leaving just the
  // icons. Hovering or focusing a button brings its label back.
  const [labelsHidden, setLabelsHidden] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    const container = mapRef.current?.getMap().getContainer();
    if (!container) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        timer = setTimeout(() => setLabelsHidden(true), 10_000);
      },
      { threshold: 0.5 },
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [loaded]);

  // The map opens on the home view, then re-fits to the pins whenever a
  // filter or search changes which ones are shown, so a filtered-down set is
  // never left off-screen. A link that arrives already filtered fits on load
  // instead (fitOnLoad). Deselecting doesn't re-fit, so closing a detail
  // leaves the map where it was.
  const fittedIds = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const firstRun = fittedIds.current === null;
    if (!firstRun && fittedIds.current === locatedIds) return;
    fittedIds.current = locatedIds;
    if (firstRun && !fitOnLoad) {
      // initialViewState can't know the sheet's height, so re-frame the home
      // view clear of it once the map exists. A selected spot flies there
      // itself (below).
      if (!selected) {
        mapRef.current?.fitBounds(HOME_BOUNDS, {
          padding: { top: 16, left: 16, right: 16, bottom: 16 + bottomPadding },
          duration: 0,
        });
      }
      return;
    }
    if (located.length === 0 || selected) return;
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
  }, [loaded, locatedIds]);

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

  // Center on the visitor, or frame them with their nearest pin. Only on a
  // tap of a location button: later position updates move the dot without
  // yanking the map away from where they've panned.
  const handledRequest = useRef(0);
  useEffect(() => {
    if (!loaded || !here || !locateRequest || locateRequest.n === handledRequest.current) return;
    handledRequest.current = locateRequest.n;
    const nearest = locateRequest.frame === "nearest" ? (sortByDistance(located, here)[0] as Located | undefined) : undefined;
    if (nearest) {
      mapRef.current?.fitBounds(
        [
          [Math.min(here.lng, nearest.lng), Math.min(here.lat, nearest.lat)],
          [Math.max(here.lng, nearest.lng), Math.max(here.lat, nearest.lat)],
        ],
        { padding: { top: 64, left: 48, right: 48, bottom: 48 + bottomPadding }, maxZoom: 15, duration: reducedMotion ? 0 : 800 },
      );
      return;
    }
    // Bottom padding keeps the dot centered above the phone sheet.
    const move = {
      center: [here.lng, here.lat] as [number, number],
      zoom: SELECT_ZOOM,
      padding: { top: 0, left: 0, right: 0, bottom: bottomPadding },
    };
    if (reducedMotion) mapRef.current?.jumpTo(move);
    else mapRef.current?.flyTo(move);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, here, locateRequest]);

  // Opens a random spot from the ones the filters show, never the one
  // already open, so each tap lands somewhere new.
  function surprise() {
    const pool = restaurants.filter((r) => r.id !== selectedId);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? restaurants[0];
    if (pick) onSelect(pick.id);
  }

  // Back to the home view of all of Singapore, framed clear of the phone
  // sheet like the first view.
  function resetView() {
    mapRef.current?.fitBounds(HOME_BOUNDS, {
      padding: { top: 16, left: 16, right: 16, bottom: 16 + bottomPadding },
      duration: reducedMotion ? 0 : 800,
    });
  }

  if (unavailable) {
    return <div className={styles.unavailable}>Map unavailable</div>;
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ bounds: HOME_BOUNDS, fitBoundsOptions: { padding: 16 } }}
      mapStyle={theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      onLoad={(e) => {
        const map = e.target;
        recolorMap(map, readMapColors());
        // Fires again after every theme switch swaps the style.
        map.on("style.load", () => {
          recolorMap(map, readMapColors());
          window.dispatchEvent(new Event(MAP_RESTYLED_EVENT));
        });
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
      <div className={styles.locateGroup} data-labels={labelsHidden ? "hidden" : undefined}>
        {onLocate && (
          <>
            <button
              type="button"
              className={styles.locate}
              title={here ? "Center the map on me" : "Share my location to find nearby spots"}
              aria-busy={(locating && locateRequest?.frame === "me") || undefined}
              data-active={here ? true : undefined}
              onClick={() => onLocate("me")}
            >
              <span className={styles.locateLabel}>Find me</span>
              <span className={styles.locateIcon}>
                {locating && locateRequest?.frame === "me" ? (
                  <CircleNotch size={18} weight="bold" aria-hidden className={styles.spinner} />
                ) : (
                  <NavigationArrow size={18} weight={here ? "fill" : "bold"} aria-hidden className={styles.arrow} />
                )}
              </span>
            </button>
            <button
              type="button"
              className={styles.locate}
              title="Show the spot nearest to me"
              aria-busy={(locating && locateRequest?.frame === "nearest") || undefined}
              onClick={() => onLocate("nearest")}
            >
              <span className={styles.locateLabel}>Closest Lick</span>
              <span className={styles.locateIcon}>
                {locating && locateRequest?.frame === "nearest" ? (
                  <CircleNotch size={18} weight="bold" aria-hidden className={styles.spinner} />
                ) : (
                  <ForkKnife size={18} weight="bold" aria-hidden />
                )}
              </span>
            </button>
          </>
        )}
        {restaurants.length > 0 && (
          <button
            type="button"
            className={styles.locate}
            title="Pick a random spot for me"
            onClick={surprise}
          >
            <span className={styles.locateLabel}>Surprise Me</span>
            <span className={styles.locateIcon}>
              <DiceFive size={18} weight="bold" aria-hidden />
            </span>
          </button>
        )}
        <button type="button" className={styles.locate} title="Show all of Singapore" onClick={resetView}>
          <span className={styles.locateLabel}>Reset Map</span>
          <span className={styles.locateIcon}>
            <ArrowCounterClockwise size={18} weight="bold" aria-hidden />
          </span>
        </button>
      </div>
      {here && (
        <Marker longitude={here.lng} latitude={here.lat} style={{ pointerEvents: "none" }}>
          <span className={styles.here} role="img" aria-label="You are here" />
        </Marker>
      )}
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
