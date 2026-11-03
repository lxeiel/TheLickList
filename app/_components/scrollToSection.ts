// Shared by the page's scroll buttons (the menu arrow, the hero's map and About).

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

// Glides to the section with this id; jumps when the device asks for
// reduced motion.
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.scrollIntoView();
  else glideTo(el);
}
