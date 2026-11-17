"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { CaretRight, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { applyFilters, EMPTY_FILTERS } from "@/lib/filters";
import { formatScore } from "@/lib/format";
import type { Recommendation } from "@/lib/recommendations";
import type { Restaurant, RestaurantStatus } from "@/lib/restaurants";
import StatusMark, { STATUS_LABEL } from "@/app/_components/StatusMark";
import {
  createRestaurantAction,
  deleteRestaurantAction,
  markLickedAction,
  updateRestaurantAction,
} from "./(protected)/actions";
import { RecsSection } from "./RecsSection";
import { RestaurantForm } from "./RestaurantForm";
import styles from "./admin.module.css";

type Editing = { mode: "new"; fromRec?: Recommendation } | { mode: "edit"; restaurant: Restaurant };

// The admin page: Licked and Gotta Lick side by side, each with its own
// search, and one popup for adding and editing.
export function AdminBoard({
  restaurants,
  recommendations,
}: {
  restaurants: Restaurant[];
  recommendations: Recommendation[];
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [tab, setTab] = useState<"restaurants" | "recs">("restaurants");
  const tabsId = useId();
  const tabs = ["restaurants", "recs"] as const;

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const last = tabs.length - 1;
    const index = tabs.indexOf(tab);
    let target: number;
    if (event.key === "ArrowRight") target = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") target = index === 0 ? last : index - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    else return;
    event.preventDefault();
    const next = tabs[target];
    setTab(next);
    document.getElementById(`${tabsId}-tab-${next}`)?.focus();
  }

  return (
    <>
      <div className={styles.header}>
        <h1>Admin</h1>
        <button type="button" className={styles.addButton} onClick={() => setEditing({ mode: "new" })}>
          Add restaurant
          <Plus size={16} aria-hidden />
        </button>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          id={`${tabsId}-tab-restaurants`}
          aria-selected={tab === "restaurants"}
          aria-controls={`${tabsId}-panel-restaurants`}
          tabIndex={tab === "restaurants" ? 0 : -1}
          className={styles.tab}
          onClick={() => setTab("restaurants")}
          onKeyDown={onTabKey}
        >
          Restaurants <span className={styles.tabCount}>{restaurants.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id={`${tabsId}-tab-recs`}
          aria-selected={tab === "recs"}
          aria-controls={`${tabsId}-panel-recs`}
          aria-label={recommendations.length > 0 ? `Recs, ${recommendations.length} waiting` : "Recs"}
          tabIndex={tab === "recs" ? 0 : -1}
          className={styles.tab}
          onClick={() => setTab("recs")}
          onKeyDown={onTabKey}
        >
          Recs
          {recommendations.length > 0 && <span className={styles.tabBadge}>{recommendations.length}</span>}
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel-restaurants`}
        aria-labelledby={`${tabsId}-tab-restaurants`}
        hidden={tab !== "restaurants"}
      >
        <div className={styles.columns}>
          <Column status="tried" restaurants={restaurants} onOpen={(r) => setEditing({ mode: "edit", restaurant: r })} />
          <Column status="wishlist" restaurants={restaurants} onOpen={(r) => setEditing({ mode: "edit", restaurant: r })} />
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel-recs`}
        aria-labelledby={`${tabsId}-tab-recs`}
        hidden={tab !== "recs"}
      >
        <RecsSection recommendations={recommendations} onAdd={(fromRec) => setEditing({ mode: "new", fromRec })} />
      </div>

      {editing && <EditDialog editing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function Column({
  status,
  restaurants,
  onOpen,
}: {
  status: RestaurantStatus;
  restaurants: Restaurant[];
  onOpen: (restaurant: Restaurant) => void;
}) {
  const [query, setQuery] = useState("");
  const [lickError, setLickError] = useState<string | undefined>();
  const [licking, setLicking] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const headingId = useId();

  const all = applyFilters(restaurants, { ...EMPTY_FILTERS, status });
  const shown = applyFilters(all, { ...EMPTY_FILTERS, q: query });
  const label = STATUS_LABEL[status];

  function lick(id: string) {
    setLicking(id);
    setLickError(undefined);
    startTransition(async () => {
      const result = await markLickedAction(id);
      setLickError(result.error);
      setLicking(null);
    });
  }

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.columnHeading}>
        <StatusMark status={status} size="md" />
        {label}
        <span className={styles.columnCount}>{all.length}</span>
      </h2>

      <label className={styles.search}>
        <MagnifyingGlass size={16} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label}`}
          aria-label={`Search ${label}`}
        />
      </label>

      {lickError && (
        <p role="alert" className={styles.formError}>
          {lickError}
        </p>
      )}

      {shown.length === 0 ? (
        <p className={styles.empty}>{all.length === 0 ? `Nothing in ${label} yet.` : "No matches."}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((restaurant) => {
            const details = [
              restaurant.area,
              restaurant.cuisine_tags.join(", "),
              restaurant.price_range,
              formatScore(restaurant),
              restaurant.photo_urls.length > 0 &&
                `${restaurant.photo_urls.length} photo${restaurant.photo_urls.length === 1 ? "" : "s"}`,
            ].filter(Boolean);
            return (
              <li key={restaurant.id} className={styles.row}>
                <button type="button" className={styles.rowMain} onClick={() => onOpen(restaurant)}>
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{restaurant.name}</span>
                    {details.length > 0 && <span className={styles.rowDetails}>{details.join(" · ")}</span>}
                  </span>
                  {restaurant.lat == null && <span className={styles.flag}>No location</span>}
                  <CaretRight size={16} aria-hidden className={styles.rowArrow} />
                </button>
                {status === "wishlist" && (
                  <button
                    type="button"
                    className={styles.lickButton}
                    disabled={licking === restaurant.id}
                    onClick={() => lick(restaurant.id)}
                    aria-label={`Move ${restaurant.name} to ${STATUS_LABEL.tried}`}
                  >
                    {licking === restaurant.id ? "Moving…" : "Licked it"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// A modal <dialog>: the browser handles focus, Esc and the backdrop. Clicking
// the backdrop doesn't close it, so a half-filled form isn't lost to a stray
// click.
function EditDialog({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const close = () => dialog.current?.close();
  const restaurant = editing.mode === "edit" ? editing.restaurant : undefined;

  async function save(input: Parameters<typeof createRestaurantAction>[0]) {
    const result = restaurant
      ? await updateRestaurantAction(restaurant.id, input)
      : await createRestaurantAction(input, editing.mode === "new" ? editing.fromRec?.id : undefined);
    if (!result.error) close();
    return result;
  }

  function remove() {
    if (!restaurant) return;
    startDelete(async () => {
      const result = await deleteRestaurantAction(restaurant.id);
      if (result.error) setDeleteError(result.error);
      else close();
    });
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{restaurant ? restaurant.name : "Add a restaurant"}</h2>
        <button type="button" className={styles.iconButton} onClick={close} aria-label="Close">
          <X size={20} aria-hidden />
        </button>
      </div>

      <RestaurantForm
        initial={restaurant}
        prefill={editing.mode === "new" ? editing.fromRec : undefined}
        onSubmit={save}
        actions={
          <>
            <button type="button" onClick={close}>
              Cancel
            </button>
            {restaurant &&
              (confirmingDelete ? (
                <span className={styles.confirmDelete}>
                  Delete {restaurant.name}?
                  <button type="button" className={styles.deleteButton} onClick={remove} disabled={deleting}>
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button type="button" onClick={() => setConfirmingDelete(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className={styles.deleteButton} onClick={() => setConfirmingDelete(true)}>
                  Delete
                </button>
              ))}
          </>
        }
      />
      {deleteError && (
        <p role="alert" className={styles.formError}>
          {deleteError}
        </p>
      )}
    </dialog>
  );
}
