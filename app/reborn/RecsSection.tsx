"use client";

import { useId, useState, useTransition } from "react";
import { timeAgo } from "@/lib/format";
import type { Recommendation } from "@/lib/recommendations";
import { dismissRecommendationAction } from "./(protected)/actions";
import styles from "./admin.module.css";

// Recommendations from visitors waiting for a decision. All of the text is
// visitor-written, so it only ever renders as React text.
export function RecsSection({
  recommendations,
  onAdd,
}: {
  recommendations: Recommendation[];
  onAdd: (rec: Recommendation) => void;
}) {
  const headingId = useId();
  if (recommendations.length === 0) return null;

  return (
    <section className={styles.recs} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.columnHeading}>
        Recs
        <span className={styles.columnCount}>{recommendations.length}</span>
      </h2>
      <ul className={styles.list}>
        {recommendations.map((rec) => (
          <RecRow key={rec.id} rec={rec} onAdd={onAdd} />
        ))}
      </ul>
    </section>
  );
}

function RecRow({ rec, onAdd }: { rec: Recommendation; onAdd: (rec: Recommendation) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [dismissing, startDismiss] = useTransition();

  function dismiss() {
    startDismiss(async () => {
      const result = await dismissRecommendationAction(rec.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className={styles.recRow}>
      <div className={styles.recText}>
        <span className={styles.rowName}>{rec.name}</span>
        <span className={styles.rowDetails}>
          {timeAgo(rec.created_at)}
          {rec.from_name && ` · from ${rec.from_name}`}
        </span>
        {rec.maps_url && (
          <a href={rec.maps_url} target="_blank" rel="noopener noreferrer">
            Google Maps link
          </a>
        )}
        {rec.notes && <p className={styles.recNotes}>{rec.notes}</p>}
      </div>
      <div className={styles.recActions}>
        <button type="button" className={styles.lickButton} onClick={() => onAdd(rec)}>
          Add to Gotta Lick
        </button>
        {confirming ? (
          <span className={styles.confirmDelete}>
            Dismiss {rec.name}?
            <button type="button" className={styles.deleteButton} onClick={dismiss} disabled={dismissing}>
              {dismissing ? "Dismissing…" : "Yes, dismiss"}
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className={styles.deleteButton} onClick={() => setConfirming(true)}>
            Dismiss
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      )}
    </li>
  );
}
