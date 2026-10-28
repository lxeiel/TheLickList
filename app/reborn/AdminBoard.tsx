"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CaretRight, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { applyFilters, EMPTY_FILTERS } from "@/lib/filters";
import { formatScore } from "@/lib/format";
import type { Restaurant, RestaurantStatus } from "@/lib/restaurants";
import StatusMark, { STATUS_LABEL } from "@/app/_components/StatusMark";
import {
  createRestaurantAction,
  deleteRestaurantAction,
  markLickedAction,
  updateRestaurantAction,
} from "./(protected)/actions";
import { RestaurantForm } from "./RestaurantForm";
import styles from "./admin.module.css";

type Editing = { mode: "new" } | { mode: "edit"; restaurant: Restaurant };

// The admin page: Licked and Gotta Lick side by side, each with its own
// search, and one popup for adding and editing.
export function AdminBoard({ restaurants }: { restaurants: Restaurant[] }) {
  const [editing, setEditing] = useState<Editing | null>(null);

  return (
    <>
      <div className={styles.header}>
        <h1>
          Restaurants <span className={styles.count}>{restaurants.length}</span>
        </h1>
        <button type="button" className={styles.addButton} onClick={() => setEditing({ mode: "new" })}>
          Add restaurant
          <Plus size={16} aria-hidden />
        </button>
      </div>

      <div className={styles.columns}>
        <Column status="tried" restaurants={restaurants} onOpen={(r) => setEditing({ mode: "edit", restaurant: r })} />
        <Column status="wishlist" restaurants={restaurants} onOpen={(r) => setEditing({ mode: "edit", restaurant: r })} />
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
      : await createRestaurantAction(input);
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
