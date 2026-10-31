"use client";

import { useRef, type RefObject } from "react";
import { pickSnap, stepSize, tapSize, type SheetSize } from "@/lib/sheet";

// Past this many pixels a press on the handle is a drag, not a tap.
const DRAG_THRESHOLD = 6;

// Follow the finger (a height) or hand the sheet back to its CSS size (null).
function setDragHeight(el: HTMLElement, height: number | null) {
  if (height == null) {
    el.style.height = "";
    delete el.dataset.dragging;
  } else {
    el.dataset.dragging = "";
    el.style.height = `${height}px`;
  }
}

type Drag = { startY: number; startHeight: number; lastY: number; lastTime: number; velocity: number; moved: boolean };

// The phone sheet's handle: drag it to any height and let go to snap to the
// nearest size (or flick to the next one), tap it to toggle half/collapsed,
// or use the arrow keys to step a size up or down. While dragging, the
// sheet's height is set directly on the element, so nothing re-renders per
// frame; data-dragging switches off its height transition meanwhile.
export function useSheetDrag({
  pane,
  size,
  getSnaps,
  onChange,
}: {
  pane: RefObject<HTMLElement | null>;
  size: SheetSize;
  getSnaps: () => Record<SheetSize, number>;
  onChange: (next: SheetSize) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const snaps = useRef<Record<SheetSize, number> | null>(null);
  // A drag ends with a click on the handle too; that one isn't a tap.
  const swallowClick = useRef(false);

  function end() {
    drag.current = null;
    if (pane.current) setDragHeight(pane.current, null);
  }

  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0 || !pane.current) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      snaps.current = getSnaps();
      drag.current = {
        startY: e.clientY,
        startHeight: pane.current.offsetHeight,
        lastY: e.clientY,
        lastTime: e.timeStamp,
        velocity: 0,
        moved: false,
      };
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const d = drag.current;
      const s = snaps.current;
      if (!d || !s || !pane.current) return;
      if (!d.moved && Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragHeight(pane.current, Math.min(s.full, Math.max(s.collapsed, d.startHeight + d.startY - e.clientY)));
      const elapsed = e.timeStamp - d.lastTime;
      if (elapsed > 0) {
        // Upward is positive; lightly smoothed so one jittery sample can't
        // turn a slow release into a flick.
        const instant = (d.lastY - e.clientY) / elapsed;
        d.velocity = d.velocity * 0.3 + instant * 0.7;
      }
      d.lastY = e.clientY;
      d.lastTime = e.timeStamp;
    },
    onPointerUp() {
      const d = drag.current;
      const s = snaps.current;
      if (!d || !s || !pane.current) return end();
      if (!d.moved) return end();
      swallowClick.current = true;
      const next = pickSnap(s, pane.current.offsetHeight, d.velocity);
      // Clearing the inline height and committing the new size land in the
      // same frame, so the sheet glides from where it was let go.
      end();
      onChange(next);
    },
    onPointerCancel: end,
    onClick() {
      if (swallowClick.current) {
        swallowClick.current = false;
        return;
      }
      onChange(tapSize(size));
    },
    onKeyDown(e: React.KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      onChange(stepSize(size, e.key === "ArrowUp" ? 1 : -1));
    },
  };
}
