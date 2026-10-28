"use client";

import { useId, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import type { RestaurantInput } from "@/lib/restaurants";
import { RestaurantForm } from "./RestaurantForm";
import styles from "./admin.module.css";

// The "Add restaurant" button and the form it opens. Saving redirects back to
// the admin page with one more restaurant, which closes the form so the next
// add starts blank.
export function AddRestaurant({
  count,
  onSubmit,
}: {
  count: number;
  onSubmit: (input: RestaurantInput) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(count);
  const formId = useId();

  if (count !== seenCount) {
    setSeenCount(count);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.addButton}
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => setOpen(!open)}
      >
        {open ? "Close" : "Add restaurant"}
        {open ? <X size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
      </button>
      {open && (
        <section id={formId} className={styles.addPanel} aria-label="Add a restaurant">
          <RestaurantForm onSubmit={onSubmit} />
        </section>
      )}
    </>
  );
}
