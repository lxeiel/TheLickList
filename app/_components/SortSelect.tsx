"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { listboxKey } from "@/lib/listbox";
import { NATURAL_DIR, SORT_OPTIONS, TABLE_SORT_LABEL, type Sort, type SortKey } from "@/lib/sort";
import Sheet from "./Sheet";
import { PHONE_QUERY, useMediaQuery } from "./useMediaQuery";
import styles from "./SortSelect.module.css";

// "SORT: NEWEST ADDED ⌄" in the same uppercase text style as "FILTERS +".
// It opens the site's own list of sorts: a popover under the button, or on
// phones a bottom sheet (like Filters there). It's a listbox: arrows move,
// Enter or Space picks, Esc or a click outside closes, and focus goes back
// to the button.
//
// "Nearest to you" is offered only once the visitor has shared their
// location (the map list). It isn't part of the URL's sort, since a shared
// link can't carry someone else's location.
const NEAREST = "nearest";

export default function SortSelect({
  sort,
  onChange,
  nearest,
  onNearest,
}: {
  sort: Sort;
  onChange: (next: Sort) => void;
  /** With onNearest, "Nearest to you" is offered; true when it's the sort in use. */
  nearest?: boolean;
  onNearest?: () => void;
}) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const base =
    sort.key === "status" || sort.key === "area" || sort.key === "price"
      ? [...SORT_OPTIONS, { value: sort.key, label: TABLE_SORT_LABEL[sort.key] }]
      : SORT_OPTIONS;
  const options = onNearest ? [{ value: NEAREST, label: "Nearest to you" }, ...base] : base;
  const current = nearest && onNearest ? NEAREST : sort.key;
  const currentIndex = Math.max(
    0,
    options.findIndex((o) => o.value === current),
  );

  function show() {
    setActive(currentIndex);
    setOpen(true);
  }

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }

  function pick(index: number) {
    const value = options[index].value;
    close(true);
    if (value === current) return;
    if (value === NEAREST) return onNearest?.();
    const key = value as SortKey;
    onChange({ key, dir: NATURAL_DIR[key] });
  }

  // The list takes the focus when it opens, so the arrows work straight away.
  // (On phones the sheet moves the focus in itself.)
  useEffect(() => {
    if (open && !isPhone) list.current?.focus();
  }, [open, isPhone]);

  // The popover closes on a click or tap anywhere else. Focus goes back to
  // the button, unless the click put it somewhere (say, the search box).
  useEffect(() => {
    if (!open || isPhone) return;
    function onPointer(e: PointerEvent) {
      if (root.current?.contains(e.target as Node)) return;
      setOpen(false);
      setTimeout(() => {
        if (document.activeElement === document.body) button.current?.focus({ preventScroll: true });
      });
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, isPhone]);

  // Keeps the highlighted option in view if the list ever scrolls.
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function onListKey(e: React.KeyboardEvent) {
    const action = listboxKey(e.key, active, options.length);
    if (!action) return;
    if ("close" in action) {
      // Tab moves on as usual; on phones the sheet handles Esc (and its own
      // focus trap) itself.
      if (isPhone) return;
      if (action.close === "escape") e.preventDefault();
      close(action.close === "escape");
      return;
    }
    e.preventDefault();
    if ("move" in action) setActive(action.move);
    else pick(action.pick);
  }

  const listbox = (
    <ul
      ref={list}
      id={`${id}-list`}
      role="listbox"
      aria-label="Sort by"
      aria-activedescendant={`${id}-${active}`}
      tabIndex={0}
      className={styles.list}
      onKeyDown={onListKey}
    >
      {options.map((option, i) => (
        <li
          key={option.value}
          id={`${id}-${i}`}
          role="option"
          aria-selected={option.value === current}
          data-active={i === active || undefined}
          className={styles.option}
          onPointerMove={() => setActive(i)}
          onClick={() => pick(i)}
        >
          <Check size={16} weight="bold" aria-hidden className={styles.check} />
          {option.label}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className={styles.root}>
      <button
        ref={button}
        type="button"
        className={styles.sort}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        data-open={open || undefined}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
      >
        <span>Sort:</span> <span className={styles.value}>{options[currentIndex].label}</span>
        <CaretDown size={14} aria-hidden className={styles.caret} />
      </button>
      {isPhone ? (
        <Sheet open={open} onClose={() => setOpen(false)} label="Sort by" placement="sheet">
          <div className={styles.sheetBody}>
            <p className={styles.sheetTitle} aria-hidden>
              Sort by
            </p>
            {listbox}
          </div>
        </Sheet>
      ) : (
        open && <div className={styles.popover}>{listbox}</div>
      )}
    </div>
  );
}
