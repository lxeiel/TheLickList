"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import CheckboxGroup from "./CheckboxGroup";
import styles from "./MultiSelect.module.css";

// A button that opens a popover below it. Closes on Esc (returning focus to
// the button) or a click outside.
export function Dropdown({
  label,
  icon,
  count = 0,
  children,
  trigger,
  buttonClassName,
  panelClassName,
  align = "start",
}: {
  label: string;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
  /** Replaces the default boxed button content (label, count, caret). */
  trigger?: ReactNode;
  buttonClassName?: string;
  /** Added to the popover, e.g. to change its size or scrolling. */
  panelClassName?: string;
  /** Which edge of the button the popover lines up with. */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.root}>
      <button
        ref={button}
        type="button"
        className={buttonClassName ?? styles.button}
        data-active={count > 0 || undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {trigger ?? (
          <>
            {icon}
            {label}
            {count > 0 && <span> · {count}</span>}
            <CaretDown size={14} aria-hidden />
          </>
        )}
      </button>
      {open && (
        <div id={panelId} className={panelClassName ? `${styles.panel} ${panelClassName}` : styles.panel} data-align={align}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Dropdown label={label} count={selected.length}>
      <CheckboxGroup legend={label} options={options} selected={selected} onChange={onChange} hideLegend />
    </Dropdown>
  );
}
