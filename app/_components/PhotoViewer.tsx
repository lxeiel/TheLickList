"use client";

import { useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import styles from "./PhotoStrip.module.css";

// Full-size food pics: a modal <dialog> holding a swipeable, snapping track.
// Arrows, ← → keys and swiping move between photos; Esc or ✕ closes.
export default function PhotoViewer({
  urls,
  name,
  startIndex,
  onClose,
}: {
  urls: string[];
  name: string;
  startIndex: number;
  /** Called with the index on screen when the viewer closed. */
  onClose: (index: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const many = urls.length > 1;

  useEffect(() => {
    dialog.current?.showModal();
    const el = track.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    // Open once, on the photo that was tapped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(by: -1 | 1) {
    const el = track.current;
    if (!el) return;
    const next = Math.min(urls.length - 1, Math.max(0, index + by));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <dialog
      ref={dialog}
      className={styles.viewer}
      aria-label={`Food pics, ${name}`}
      onClose={() => onClose(index)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div
        ref={track}
        className={styles.track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {urls.map((url, i) => (
          <div key={url} className={styles.slide}>
            {/* eslint-disable-next-line @next/next/no-img-element -- photos are already resized at upload */}
            <img src={url} alt={`Photo ${i + 1} of ${urls.length}, ${name}`} />
          </div>
        ))}
      </div>

      <div className={styles.viewerBar}>
        {many && (
          <span className={styles.count} aria-live="polite">
            {index + 1} / {urls.length}
          </span>
        )}
        <button type="button" className={styles.viewerButton} onClick={() => dialog.current?.close()} aria-label="Close">
          <X size={22} aria-hidden />
        </button>
      </div>

      {many && (
        <>
          <button
            type="button"
            className={`${styles.viewerButton} ${styles.prev}`}
            onClick={() => go(-1)}
            // aria-disabled, not disabled: a disabled button drops focus to
            // the page, and the ← → keys stop reaching the viewer.
            aria-disabled={index === 0}
            aria-label="Previous photo"
          >
            <CaretLeft size={22} aria-hidden />
          </button>
          <button
            type="button"
            className={`${styles.viewerButton} ${styles.next}`}
            onClick={() => go(1)}
            aria-disabled={index === urls.length - 1}
            aria-label="Next photo"
          >
            <CaretRight size={22} aria-hidden />
          </button>
        </>
      )}
    </dialog>
  );
}
