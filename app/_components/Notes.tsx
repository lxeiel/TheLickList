"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RestaurantDetail.module.css";

// Lex's notes in a box, cut to four lines with "Read more" when they run
// longer. Short notes show in full with no link.
export default function Notes({ text }: { text: string }) {
  const body = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Measure while clamped (and again if the panel resizes) to see whether
  // anything is hidden.
  useEffect(() => {
    const el = body.current;
    if (!el || expanded) return;
    const observer = new ResizeObserver(() => setOverflows(el.scrollHeight > el.clientHeight + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className={styles.notesBox}>
      <p ref={body} className={styles.notes} data-clamped={!expanded || undefined}>
        {text}
      </p>
      {overflows && (
        <button type="button" className={styles.readMore} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
