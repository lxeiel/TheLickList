import type { Map as MapboxMap } from "mapbox-gl";

export type MapColors = { land: string; water: string; park: string; road: string };

// The --map-* tokens in globals.css are the single source for map colors.
export function readMapColors(): MapColors {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    land: token("--map-land"),
    water: token("--map-water"),
    park: token("--map-park"),
    road: token("--map-road"),
  };
}

// Recolors Mapbox's light-v11 / dark-v11 base layers to the site palette.
// Each layer is checked first, so a style without one is simply skipped.
export function recolorMap(map: MapboxMap, colors: MapColors): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", colors.land);
    } else if (layer.type === "fill" && layer.id === "water") {
      map.setPaintProperty(layer.id, "fill-color", colors.water);
    } else if (layer.type === "fill" && layer.id === "national-park") {
      map.setPaintProperty(layer.id, "fill-color", colors.park);
    } else if (layer.type === "line" && layer.id.startsWith("road-") && !layer.id.includes("label")) {
      map.setPaintProperty(layer.id, "line-color", colors.road);
    }
  }
}
