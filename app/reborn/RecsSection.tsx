"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { linkHost, timeAgo } from "@/lib/format";
import type { Recommendation } from "@/lib/recommendations";
import { matchesRecSearch, visibleSelection } from "@/lib/recommendationSearch";
import { dismissRecommendationAction, dismissRecommendationsAction } from "./(protected)/actions";
import styles from "./admin.module.css";

// The Recs tab: recommendations from visitors waiting for a decision. All of
// the text is visitor-written, so it only ever renders as React text.
export function RecsSection({
  recommendations,
  onAdd,
}: {
  recommendations: Recommendation[];
  onAdd: (rec: Recommendation) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingFor, setConfirmingFor] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [dismissing, startDismiss] = useTransition();
  const selectAll = useRef<HTMLInputElement>(null);
  const keepBatch = useRef<HTMLButtonElement>(null);

  const selectedIds = visibleSelection(recommendations, query, selected);
  const shown = recommendations.filter((rec) => matchesRecSearch(rec, query));
  // Ticks for recs that are gone (dismissed, or added as restaurants) simply
  // stop counting: everything below reads the selection through the live list.
  const shownSelected = selectedIds.length;
  const allShown = shown.length > 0 && shownSelected === shown.length;
  const someShown = shownSelected > 0 && !allShown;

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = someShown;
  }, [someShown]);

  function toggle(id: string) {
    setConfirmingFor(null);
    setError(undefined);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setConfirmingFor(null);
    setError(undefined);
    setSelected((current) => {
      const next = new Set(current);
      for (const rec of shown) {
        if (allShown) next.delete(rec.id);
        else next.add(rec.id);
      }
      return next;
    });
  }

  function dismissSelected() {
    setError(undefined);
    startDismiss(async () => {
      const result = await dismissRecommendationsAction(selectedIds);
      if (result.error) {
        setError(result.error);
      } else {
        setSelected(new Set());
        setConfirmingFor(null);
        selectAll.current?.focus();
      }
    });
  }

  const n = selectedIds.length;
  // Armed for one specific count: if it changes, back to "Dismiss selected".
  const confirmingBatch = n > 0 && confirmingFor === n;

  return (
    <section className={styles.recs} aria-label="Recs">
      <div className={styles.recsToolbar}>
        <label className={styles.selectAll}>
          <input
            ref={selectAll}
            type="checkbox"
            checked={allShown}
            disabled={shown.length === 0}
            onChange={toggleAll}
          />
          Select all
        </label>
        <label className={styles.search}>
          <MagnifyingGlass size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setConfirmingFor(null);
              setError(undefined);
            }}
            placeholder="Search recs"
            aria-label="Search recs"
          />
        </label>
      </div>

      {n > 0 && (
        <div className={styles.batchBar}>
          <span>{n} selected</span>
          {confirmingBatch ? (
            <span className={styles.confirmDelete}>
              Dismiss {n} {n === 1 ? "rec" : "recs"}?
              <button type="button" className={styles.deleteButton} onClick={dismissSelected} disabled={dismissing}>
                {dismissing ? "Dismissing…" : "Yes, dismiss"}
              </button>
              <button ref={keepBatch} type="button" onClick={() => setConfirmingFor(null)}>
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => {
                setConfirmingFor(n);
                // Wait for the confirm buttons to render, then move to Keep.
                requestAnimationFrame(() => keepBatch.current?.focus());
              }}
            >
              Dismiss selected
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className={styles.empty}>{recommendations.length === 0 ? "No recs waiting." : "No recs match."}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((rec) => (
            <RecRow key={rec.id} rec={rec} checked={selected.has(rec.id)} onToggle={toggle} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecRow({
  rec,
  checked,
  onToggle,
  onAdd,
}: {
  rec: Recommendation;
  checked: boolean;
  onToggle: (id: string) => void;
  onAdd: (rec: Recommendation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [dismissing, startDismiss] = useTransition();
  const detailsId = useId();
  const nameId = useId();
  const metaId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const host = rec.maps_url ? linkHost(rec.maps_url) : null;

  function dismiss() {
    startDismiss(async () => {
      const result = await dismissRecommendationAction(rec.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className={styles.recRow}>
      <input
        type="checkbox"
        className={styles.recCheck}
        checked={checked}
        onChange={() => onToggle(rec.id)}
        aria-label={`Select ${rec.name}`}
      />
      <button
        type="button"
        className={styles.recMain}
        aria-expanded={open}
        aria-controls={detailsId}
        aria-labelledby={nameId}
        aria-describedby={metaId}
        onClick={() => setOpen((v) => !v)}
      >
        <span id={nameId} className={styles.rowName}>
          {rec.name}
        </span>
        <span id={metaId} className={open ? styles.recMetaOpen : styles.recMeta} suppressHydrationWarning>
          {[timeAgo(rec.created_at), rec.from_name && `from ${rec.from_name}`, !open && rec.notes]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>
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
            <button ref={keepRef} type="button" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.quietDismiss}
            onClick={() => {
              setConfirming(true);
              requestAnimationFrame(() => keepRef.current?.focus());
            }}
          >
            Dismiss
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      )}
      <div id={detailsId} className={styles.recDetails} hidden={!open}>
        {rec.notes && (
          <>
            <span className={styles.recLabel}>NOTES</span>
            <p className={styles.recNotes}>{rec.notes}</p>
          </>
        )}
        {rec.maps_url ? (
          <a href={rec.maps_url} target="_blank" rel="noopener noreferrer">
            {host ?? "Google Maps link"} ↗
          </a>
        ) : (
          <span className={styles.recNoLink}>No Maps link</span>
        )}
      </div>
    </li>
  );
}
