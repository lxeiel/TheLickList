// The phone map's bottom sheet rests at one of three sizes the visitor picks:
// collapsed (just the search), default (half the screen, a bit more for a
// restaurant's details) or full (the list covers the map).
export type SheetSize = "collapsed" | "default" | "full";

const ORDER: SheetSize[] = ["collapsed", "default", "full"];

// A release faster than this (px per ms, upward positive) counts as a flick.
const FLICK_SPEED = 0.4;

// Where a drag of the sheet's handle lands: the nearest size, or on a flick
// the next size in the flick's direction from where it was let go.
export function pickSnap(snaps: Record<SheetSize, number>, height: number, velocity: number): SheetSize {
  if (Math.abs(velocity) >= FLICK_SPEED) {
    if (velocity > 0) return ORDER.find((size) => snaps[size] > height) ?? "full";
    return [...ORDER].reverse().find((size) => snaps[size] < height) ?? "collapsed";
  }
  return ORDER.reduce((best, size) =>
    Math.abs(snaps[size] - height) < Math.abs(snaps[best] - height) ? size : best,
  );
}

// One size bigger (1) or smaller (-1), for the handle's arrow keys.
export function stepSize(size: SheetSize, direction: 1 | -1): SheetSize {
  const index = Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(size) + direction));
  return ORDER[index];
}

// A tap on the handle: half ↔ collapsed, and full back down to half.
export function tapSize(size: SheetSize): SheetSize {
  return size === "default" ? "collapsed" : "default";
}
