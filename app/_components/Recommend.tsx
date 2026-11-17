"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { Check, X } from "@phosphor-icons/react";
import { submitRecommendationAction } from "@/app/_actions/recommend";
import {
  MAX_REC_FROM,
  MAX_REC_MAPS_URL,
  MAX_REC_NAME,
  MAX_REC_NOTES,
} from "@/lib/recommendationLimits";
import styles from "./Recommend.module.css";

const HASH = "#recommend";

type RecommendApi = { open: () => void };

const RecommendContext = createContext<RecommendApi>({ open: () => {} });

export function useRecommend(): RecommendApi {
  return useContext(RecommendContext);
}

// Holds the popup's open state so any page can open it. The homepage also
// opens it from /#recommend.
export function RecommendProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const api = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    function syncWithHash() {
      if (location.pathname === "/" && location.hash === HASH) setIsOpen(true);
    }
    syncWithHash();
    window.addEventListener("hashchange", syncWithHash);
    return () => window.removeEventListener("hashchange", syncWithHash);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    if (location.hash === HASH) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }, []);

  return (
    <RecommendContext.Provider value={api}>
      {children}
      {isOpen && <RecommendDialog onClose={close} />}
    </RecommendContext.Provider>
  );
}

export function RecommendButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open } = useRecommend();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}

function RecommendDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Changing the key remounts the form, so "Recommend another" starts empty.
  const [round, setRound] = useState(0);
  const [sent, setSent] = useState(false);
  const doneButton = useRef<HTMLButtonElement>(null);

  // Focus would otherwise drop to the body when the form unmounts.
  useEffect(() => {
    if (sent) doneButton.current?.focus();
  }, [sent]);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  // The backdrop doesn't close it: a stray tap shouldn't throw away what was typed.
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            Recommend Licks
          </h2>
          {!sent && (
            <p className={styles.subtitle}>
              Know somewhere I should try? Tell me.
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={() => dialog.current?.close()}
          aria-label="Close"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      {sent ? (
        <div className={styles.thanks} role="status">
          <span className={styles.thanksIcon}>
            <Check size={32} weight="bold" aria-hidden />
          </span>
          <p className={styles.thanksTitle}>Thanks!</p>
          <p className={styles.thanksText}>I&apos;ll check it out.</p>
          <div className={styles.thanksActions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setRound((n) => n + 1);
                setSent(false);
              }}
            >
              Recommend another
            </button>
            <button
              ref={doneButton}
              type="button"
              className={styles.submit}
              onClick={() => dialog.current?.close()}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <RecommendForm key={round} onSent={() => setSent(true)} />
      )}
    </dialog>
  );
}

function RecommendForm({ onSent }: { onSent: () => void }) {
  const [name, setName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [from, setFrom] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const ids = useId();
  const mapsHint = `${ids}-maps-hint`;
  const fromHint = `${ids}-from-hint`;
  const errorId = `${ids}-error`;

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await submitRecommendationAction({
          name,
          maps_url: mapsUrl,
          notes,
          from_name: from,
          website,
        });
        if ("error" in result) setError(result.error);
        else onSent();
      } catch {
        setError("Couldn't send that. Try again.");
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.label}>Shop name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_REC_NAME}
          required
          autoComplete="off"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Google Maps link</span>
        <input
          type="text"
          inputMode="url"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          maxLength={MAX_REC_MAPS_URL}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={mapsHint}
        />
        <span id={mapsHint} className={styles.hint}>
          In Google Maps, tap Share, then Copy link
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={MAX_REC_NOTES}
          rows={3}
          placeholder="Dishes to try, why you love it"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Your name</span>
        <input
          type="text"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          maxLength={MAX_REC_FROM}
          autoComplete="off"
          aria-describedby={fromHint}
        />
        <span id={fromHint} className={styles.hint}>
          Only I see this
        </span>
      </label>

      {/* Trap for bots: invisible to people, tempting to scripts. */}
      <input
        type="text"
        name="website"
        className={styles.trap}
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Sending…" : "Send it"}
      </button>
    </form>
  );
}
