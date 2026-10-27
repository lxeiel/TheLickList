"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  type FilterOptions,
  type Filters,
  type StatusFilter,
} from "@/lib/filters";
import type { Sort } from "@/lib/sort";
import CheckboxGroup from "./CheckboxGroup";
import MultiSelect, { Dropdown } from "./MultiSelect";
import Sheet from "./Sheet";
import { PHONE_QUERY, useMediaQuery } from "./useMediaQuery";
import styles from "./FilterBar.module.css";

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tried", label: "Licked" },
  { value: "wishlist", label: "Gotta Lick" },
];

const SORTS: { value: string; label: string; sort: Sort }[] = [
  { value: "added", label: "Newest added", sort: { key: "added", dir: "desc" } },
  { value: "rating", label: "Highest rated", sort: { key: "rating", dir: "desc" } },
  { value: "name", label: "A–Z", sort: { key: "name", dir: "asc" } },
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
  const written = useRef<string | null>(null);
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    // Our own write arriving: consume it once. Anything else changed from
    // outside (Clear all, back/forward): follow it.
    if (filters.q === written.current) written.current = null;
    else setText(filters.q);
  }

  const latest = useRef({ filters, onChange });
  useLayoutEffect(() => {
    latest.current = { filters, onChange };
  });

  useEffect(() => {
    if (text === latest.current.filters.q) return;
    const timer = setTimeout(() => {
      written.current = text;
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

function FilterGroups({ filters, options, onChange }: { filters: Filters; options: FilterOptions; onChange: (next: Filters) => void }) {
  return (
    <>
      <CheckboxGroup legend="Cuisine" options={options.cuisine} selected={filters.cuisine} onChange={(cuisine) => onChange({ ...filters, cuisine })} />
      <CheckboxGroup legend="Area" options={options.area} selected={filters.area} onChange={(area) => onChange({ ...filters, area })} />
      <CheckboxGroup legend="Price" options={options.price} selected={filters.price} onChange={(price) => onChange({ ...filters, price })} />
    </>
  );
}

// Cuisine/area/price behind one button: a popover on desktop, a sheet on phone.
function FiltersButton({ filters, options, onChange }: { filters: Filters; options: FilterOptions; onChange: (next: Filters) => void }) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = activeFilterCount(filters);
  const icon = <Funnel size={16} aria-hidden />;

  if (!isPhone) {
    return (
      <Dropdown label="Filters" icon={icon} count={count}>
        <FilterGroups filters={filters} options={options} onChange={onChange} />
      </Dropdown>
    );
  }

  return (
    <>
      <button type="button" className={styles.filtersButton} data-active={count > 0 || undefined} onClick={() => setSheetOpen(true)}>
        {icon}
        Filters
        {count > 0 && <span> · {count}</span>}
      </button>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Filters" placement="sheet">
        <div className={styles.sheetBody}>
          <FilterGroups filters={filters} options={options} onChange={onChange} />
        </div>
        <div className={styles.sheetFooter}>
          <button type="button" className={styles.done} onClick={() => setSheetOpen(false)}>
            Done
          </button>
        </div>
      </Sheet>
    </>
  );
}

function Chips({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  if (activeFilterCount(filters) === 0) return null;
  const chips = (["cuisine", "area", "price"] as const).flatMap((key) =>
    filters[key].map((value) => ({ key, value })),
  );
  return (
    <div className={styles.chips}>
      {chips.map(({ key, value }) => (
        <button
          key={`${key}:${value}`}
          type="button"
          className={styles.chip}
          aria-label={`Remove filter: ${value}`}
          onClick={() => onChange({ ...filters, [key]: filters[key].filter((v) => v !== value) })}
        >
          {value}
          <X size={12} aria-hidden />
        </button>
      ))}
      <button type="button" className={styles.clearAll} onClick={() => onChange(EMPTY_FILTERS)}>
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
  const sortValue = sort ? (SORTS.find((s) => s.sort.key === sort.key)?.value ?? "added") : "added";

  return (
    <div className={styles.bar} data-variant={variant}>
      <div className={styles.row}>
        <StatusControl value={filters.status} onChange={(status) => onChange({ ...filters, status })} />
        <SearchInput filters={filters} onChange={onChange} />
        <div className={styles.menus}>
          {variant === "list" ? (
            <>
              <div className={styles.desktopOnly}>
                <MultiSelect label="Cuisine" options={options.cuisine} selected={filters.cuisine} onChange={(cuisine) => onChange({ ...filters, cuisine })} />
                <MultiSelect label="Area" options={options.area} selected={filters.area} onChange={(area) => onChange({ ...filters, area })} />
                <MultiSelect label="Price" options={options.price} selected={filters.price} onChange={(price) => onChange({ ...filters, price })} />
              </div>
              <div className={styles.phoneOnly}>
                <FiltersButton filters={filters} options={options} onChange={onChange} />
                {onSortChange && (
                  <label className={styles.sortSelect}>
                    <span className="visually-hidden">Sort</span>
                    <select
                      value={sortValue}
                      onChange={(e) => onSortChange(SORTS.find((s) => s.value === e.target.value)!.sort)}
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </>
          ) : (
            <FiltersButton filters={filters} options={options} onChange={onChange} />
          )}
        </div>
      </div>
      <Chips filters={filters} onChange={onChange} />
    </div>
  );
}
