"use client";

import { useState } from "react";
import PhotoViewer from "./PhotoViewer";
import styles from "./PhotoStrip.module.css";

// Food pics in the detail panel: a sideways-scrolling row of squares, with
// the next one peeking in at the edge. Tapping one opens it full size.
export default function PhotoStrip({ urls, name }: { urls: string[]; name: string }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const shown = urls.filter((url) => !failed.has(url));

  if (shown.length === 0) return null;

  return (
    <>
      <div className={styles.strip} tabIndex={0} aria-label={`Food pics, ${name}`} role="group">
        {shown.map((url, i) => (
          <button
            key={url}
            type="button"
            className={styles.tile}
            data-photo-index={i}
            aria-label={`Photo ${i + 1} of ${shown.length}, ${name}`}
            onClick={() => setOpen(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- photos are already resized at upload */}
            <img
              src={url}
              alt=""
              width={120}
              height={120}
              loading="lazy"
              // A file deleted by hand in Supabase hides its tile rather than
              // showing a broken image.
              onError={() => setFailed((prev) => new Set(prev).add(url))}
            />
          </button>
        ))}
      </div>
      {open !== null && (
        <PhotoViewer
          urls={shown}
          name={name}
          startIndex={open}
          onClose={(index) => {
            setOpen(null);
            // Back to the photo that was last on screen, so keyboard users
            // land where they left off.
            requestAnimationFrame(() =>
              document.querySelector<HTMLButtonElement>(`[data-photo-index="${index}"]`)?.focus(),
            );
          }}
        />
      )}
    </>
  );
}
