"use client";

import { ArrowDown } from "@phosphor-icons/react";
import styles from "./ScrollDownButton.module.css";

// Slow to start, glides, then settles: the browser's own smooth scroll is
// quicker and more mechanical over a full screen.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Longer trips take a little longer, within bounds.
const durationFor = (distance: number) => Math.min(1100, Math.max(650, Math.abs(distance) * 0.7));

const INTERRUPTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

function glideTo(target: HTMLElement) {
  const start = window.scrollY;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const distance = target.getBoundingClientRect().top - margin;
  const duration = durationFor(distance);
  const began = performance.now();
  let frame = 0;

  // The visitor scrolling or tapping takes over at once, rather than the
  // page fighting them.
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of INTERRUPTS) window.removeEventListener(type, stop);
  };
  for (const type of INTERRUPTS) window.addEventListener(type, stop, { passive: true });

  const step = (now: number) => {
    const t = Math.min(1, (now - began) / duration);
    window.scrollTo(0, start + distance * easeInOutCubic(t));
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
}

// Round ↓ button that scrolls to a section on the page; instant when the
// device asks for reduced motion. The label is for screen readers only.
export default function ScrollDownButton({ target, label }: { target: string; label: string }) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      onClick={() => {
        const el = document.getElementById(target);
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.scrollIntoView();
        else glideTo(el);
      }}
    >
      <span className={styles.circle}>
        <ArrowDown size={18} aria-hidden />
      </span>
    </button>
  );
}
