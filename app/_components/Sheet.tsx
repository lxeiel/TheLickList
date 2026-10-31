"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Sheet.module.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Skips controls a breakpoint hides (e.g. the popup's phone-only back link),
// which can't take focus.
const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.checkVisibility());

const LEAVE_MS = 160;

const noopSubscribe = () => () => {};

// A modal overlay: a drawer from the right, a sheet from the bottom, or
// "popup" (a centered dialog at ≥768px, a sheet from the bottom below). Focus moves in on open, is
// trapped while open, and returns to whatever opened it on close.
export default function Sheet({
  open,
  onClose,
  label,
  placement,
  height = "auto",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  placement: "drawer" | "sheet" | "popup";
  height?: "85%" | "auto";
  children: ReactNode;
}) {
  const [rendered, setRendered] = useState(open);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // Mount immediately on open; unmount after the leave transition on close,
  // handing focus back to whatever opened the sheet. Restoring focus here
  // rather than in an effect cleanup matters: effects can be re-run (Strict
  // Mode, hidden/shown route segments) and a cleanup-time restore gets undone.
  if (open && !rendered) setRendered(true);
  useEffect(() => {
    if (open || !rendered) return;
    const timer = setTimeout(() => {
      const target = opener.current;
      const active = document.activeElement;
      const focusWasInside = active === document.body || (panel.current?.contains(active) ?? false);
      if (focusWasInside && target instanceof HTMLElement && target.isConnected) target.focus();
      setRendered(false);
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [open, rendered]);

  // Only a real closed → open transition records the opener and moves focus.
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      opener.current = document.activeElement;
      if (panel.current) focusables(panel.current)[0]?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // The portal targets document.body, which doesn't exist during the server
  // render (e.g. opening a /list?spot= link), so only render once mounted.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!rendered || !mounted) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    // A native <dialog> inside the sheet (the photo viewer) closes itself on
    // Esc; the sheet stays open behind it.
    if ((e.target as Element).closest("dialog")) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = focusables(panel.current);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className={styles.root} data-state={open ? "open" : "closed"}>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`${styles.panel} ${styles[placement]}`}
        data-height={height}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
