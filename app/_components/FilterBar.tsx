"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  clearMenuFilters,
  type FilterOptions,
  type Filters,
  type StatusFilter,
} from "@/lib/filters";
import { DEFAULT_SORT, sortChipLabel, type Sort } from "@/lib/sort";
import CheckboxGroup from "./CheckboxGroup";
import { Dropdown } from "./MultiSelect";
import ScoreGroup from "./ScoreGroup";
import SortSelect from "./SortSelect";
import Sheet from "./Sheet";
import StatusGroup from "./StatusGroup";
import { PHONE_QUERY, useMediaQuery } from "./useMediaQuery";
import styles from "./FilterBar.module.css";

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tried", label: "Licked" },
  { value: "wishlist", label: "Gotta Lick" },
];

const SEARCH_DEBOUNCE_MS = 200;

function StatusControl({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + STATUSES.length) % STATUSES.length;
    onChange(STATUSES[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Status" className={styles.segmented}>
      {STATUSES.map((s, i) => (
        <button
          key={s.value}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === s.value}
          tabIndex={value === s.value ? 0 : -1}
          className={styles.segment}
          onClick={() => onChange(s.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function SearchInput({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  // Local text keeps typing instant; the URL is written after a pause.
  const [text, setText] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  // What this input last wrote to the URL. Our own write comes back through
  // useSearchParams a render later (Next applies it in a transition), so it
  // must not be mistaken for an outside change — resetting the text then
  // would blank the box and throw the caret to the end.
  const [written, setWritten] = useState<string | null>(null);
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    // Our own write arriving: consume it once. Anything else changed from
    // outside (Clear all, back/forward): follow it.
    if (filters.q === written) setWritten(null);
    else setText(filters.q);
  }

  const latest = useRef({ filters, onChange });
  useLayoutEffect(() => {
    latest.current = { filters, onChange };
  });

  useEffect(() => {
    if (text === latest.current.filters.q) return;
    const timer = setTimeout(() => {
      setWritten(text);
      latest.current.onChange({ ...latest.current.filters, q: text });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <label className={styles.search}>
      <MagnifyingGlass size={16} aria-hidden className={styles.searchIcon} />
      <span className="visually-hidden">Search</span>
      <input
        type="search"
        value={text}
        placeholder="Search name, cuisine, area"
        onChange={(e) => setText(e.target.value)}
      />
    </label>
  );
}

// On phones a long group shows this many options behind "Show all".
const PHONE_GROUP_LIMIT = 6;

function FilterGroups({
  filters,
  options,
  onChange,
  isPhone,
}: {
  filters: Filters;
  options: FilterOptions;
  onChange: (next: Filters) => void;
  isPhone: boolean;
}) {
  // Score is a short row of pills across the top; the longer lists sit
  // side by side beneath it, each scrolling on its own (stacked on phones,
  // where long ones collapse instead).
  const collapseAfter = isPhone ? PHONE_GROUP_LIMIT : undefined;
  return (
    <div className={styles.filterGroups}>
      {/* Phones hide the status tabs, so status is chosen here instead. */}
      {isPhone && <StatusGroup value={filters.status} onChange={(status) => onChange({ ...filters, status })} />}
      <ScoreGroup value={filters.minScore} onChange={(minScore) => onChange({ ...filters, minScore })} />
      <div className={styles.filterColumns}>
        <CheckboxGroup legend="Cuisine" options={options.cuisine} selected={filters.cuisine} onChange={(cuisine) => onChange({ ...filters, cuisine })} collapseAfter={collapseAfter} />
        <CheckboxGroup legend="Area" options={options.area} selected={filters.area} onChange={(area) => onChange({ ...filters, area })} collapseAfter={collapseAfter} />
        <CheckboxGroup legend="Price" options={options.price} selected={filters.price} onChange={(price) => onChange({ ...filters, price })} collapseAfter={collapseAfter} />
      </div>
    </div>
  );
}

// Score/cuisine/area/price (and status, on phones) behind one "Filters +"
// text button: a popover on desktop, a sheet on phone.
function FiltersButton({ filters, options, onChange }: { filters: Filters; options: FilterOptions; onChange: (next: Filters) => void }) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scope = { includeStatus: isPhone };
  const count = activeFilterCount(filters, scope);
  // Empties what's set in this menu; greyed out when nothing is.
  const clear = (
    <button type="button" className={styles.clearFilters} disabled={count === 0} onClick={() => onChange(clearMenuFilters(filters, scope))}>
      Clear filters
    </button>
  );
  const label = (
    <>
      Filters{count > 0 && <b className={styles.filtersCount}> {count}</b>} <Plus size={14} aria-hidden />
    </>
  );

  if (!isPhone) {
    return (
      <Dropdown label="Filters" count={count} trigger={label} buttonClassName={styles.filtersText} panelClassName={styles.filtersPanel} align="end">
        <FilterGroups filters={filters} options={options} onChange={onChange} isPhone={false} />
        <div className={styles.menuFooter}>{clear}</div>
      </Dropdown>
    );
  }

  return (
    <>
      <button type="button" className={styles.filtersText} aria-expanded={sheetOpen} onClick={() => setSheetOpen(true)}>
        {label}
      </button>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Filters" placement="sheet">
        <div className={styles.sheetBody}>
          <FilterGroups filters={filters} options={options} onChange={onChange} isPhone />
        </div>
        <div className={styles.sheetFooter}>
          {clear}
          <button type="button" className={styles.done} onClick={() => setSheetOpen(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </>
  );
}

// Removable chips for the active filters and, on the List page, a sort other
// than newest first. Clear all resets both.
function Chips({
  filters,
  onChange,
  sort,
  onSortChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  sort?: Sort;
  onSortChange?: (next: Sort) => void;
}) {
  // On phones status lives in the Filters menu, so it gets a chip too.
  const isPhone = useMediaQuery(PHONE_QUERY);
  const statusChip = isPhone && filters.status !== "all" ? STATUSES.find((s) => s.value === filters.status)?.label : null;
  const sortLabel = sort && onSortChange ? sortChipLabel(sort) : null;
  if (activeFilterCount(filters) === 0 && !sortLabel && !statusChip) return null;
  const chips = (["cuisine", "area", "price"] as const).flatMap((key) =>
    filters[key].map((value) => ({ key, value })),
  );
  return (
    <div className={styles.chips}>
      {statusChip && (
        <button
          type="button"
          className={styles.chip}
          aria-label={`Remove filter: ${statusChip}`}
          onClick={() => onChange({ ...filters, status: "all" })}
        >
          {statusChip} ×
        </button>
      )}
      {filters.minScore != null && (
        <button
          type="button"
          className={styles.chip}
          aria-label={`Remove filter: score ${filters.minScore} and up`}
          onClick={() => onChange({ ...filters, minScore: null })}
        >
          {filters.minScore}+ score ×
        </button>
      )}
      {chips.map(({ key, value }) => (
        <button
          key={`${key}:${value}`}
          type="button"
          className={styles.chip}
          aria-label={`Remove filter: ${value}`}
          onClick={() => onChange({ ...filters, [key]: filters[key].filter((v) => v !== value) })}
        >
          {value} ×
        </button>
      ))}
      {sortLabel && (
        <button
          type="button"
          className={styles.chip}
          aria-label={`Reset sort to newest first (now ${sortLabel})`}
          onClick={() => onSortChange?.(DEFAULT_SORT)}
        >
          <span className={styles.chipPrefix}>Sorted:</span> {sortLabel} ×
        </button>
      )}
      <button
        type="button"
        className={styles.clearAll}
        onClick={() => {
          onChange(EMPTY_FILTERS);
          if (sortLabel) onSortChange?.(DEFAULT_SORT);
        }}
      >
        Clear all
      </button>
    </div>
  );
}

export default function FilterBar({
  variant,
  filters,
  options,
  onChange,
  sort,
  onSortChange,
}: {
  variant: "map" | "list";
  filters: Filters;
  options: FilterOptions;
  onChange: (next: Filters) => void;
  sort?: Sort;
  onSortChange?: (next: Sort) => void;
}) {

  return (
    <div className={styles.bar} data-variant={variant}>
      <div className={styles.row}>
        <StatusControl value={filters.status} onChange={(status) => onChange({ ...filters, status })} />
        <div className={styles.searchRow}>
          <SearchInput filters={filters} onChange={onChange} />
          <FiltersButton filters={filters} options={options} onChange={onChange} />
          {/* Phones only: the List page's sort, and the map sheet's. */}
          {onSortChange && (
            <span className={styles.sortSelect}>
              <SortSelect sort={sort ?? DEFAULT_SORT} onChange={onSortChange} />
            </span>
          )}
        </div>
      </div>
      <Chips
        filters={filters}
        onChange={onChange}
        sort={variant === "list" ? sort : undefined}
        onSortChange={variant === "list" ? onSortChange : undefined}
      />
    </div>
  );
}
