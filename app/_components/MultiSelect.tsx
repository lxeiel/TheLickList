"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import CheckboxGroup from "./CheckboxGroup";
import styles from "./MultiSelect.module.css";

// A button that opens a popover below it. Closes on Esc (returning focus to
// the button) or a click outside. With openOnHover a mouse also opens it
// just by pointing; a click (or a tap, or Enter) then keeps it open.
export function Dropdown({
  label,
  icon,
  count = 0,
  children,
  trigger,
  buttonClassName,
  panelClassName,
  rootClassName,
  align = "start",
  openOnHover = false,
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
  /** Added to the wrapper, e.g. to position the popover against an ancestor instead. */
  rootClassName?: string;
  /** Which edge of the button the popover lines up with. */
  align?: "start" | "end";
  /** Also open while a mouse is over the button or the popover. */
  openOnHover?: boolean;
}) {
  // Clicked open, which lasts until it's dismissed; or hovered open, which
  // lasts as long as the mouse stays.
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setPinned(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // A popover that's only hovered open leaves the focus where it is:
        // the visitor may be typing somewhere else.
        if (pinned) button.current?.focus();
        setPinned(false);
        setHovered(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, pinned]);

  return (
    <div
      ref={root}
      className={rootClassName ? `${styles.root} ${rootClassName}` : styles.root}
      // Touch has no hover: a tap's pointerenter would open it just before
      // its click closed it again.
      onPointerEnter={openOnHover ? (e) => e.pointerType === "mouse" && setHovered(true) : undefined}
      onPointerLeave={openOnHover ? () => setHovered(false) : undefined}
    >
      <button
        ref={button}
        type="button"
        className={buttonClassName ?? styles.button}
        data-active={count > 0 || undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setPinned(!pinned)}
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
