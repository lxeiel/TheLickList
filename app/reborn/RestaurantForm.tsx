"use client";

import { useReducer, useState, type FormEvent, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import type { Restaurant, RestaurantInput, RestaurantLink, RestaurantStatus } from "@/lib/restaurants";
import type { FoodItem } from "@/lib/foods";
import { defaultLinkLabel, MAX_LINK_LABEL } from "@/lib/links";
import { initialPhotos, photoReducer, savedUrls, uploadingCount } from "@/lib/photoUploads";
import { STATUS_LABEL } from "@/app/_components/StatusMark";
import { FoodRows } from "./FoodRows";
import { PhotoPicker } from "./PhotoPicker";
import styles from "./admin.module.css";

const SINGAPORE_AREAS = ["Central", "East", "North", "Northeast", "West"];

export function RestaurantForm({
  initial,
  onSubmit,
  actions,
}: {
  initial?: Restaurant;
  onSubmit: (input: RestaurantInput) => Promise<{ error?: string }>;
  /** Extra buttons shown beside Save (the popup's Cancel and Delete). */
  actions?: ReactNode;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mapsUrl, setMapsUrl] = useState(initial?.maps_url ?? "");
  const [links, setLinks] = useState<RestaurantLink[]>(initial?.links ?? []);
  const [cuisineTagsText, setCuisineTagsText] = useState(
    (initial?.cuisine_tags ?? []).join(", "),
  );
  const [priceRange, setPriceRange] = useState(initial?.price_range ?? "");
  const [status, setStatus] = useState<RestaurantStatus>(initial?.status ?? "wishlist");
  const [rating, setRating] = useState(initial?.rating != null ? String(initial.rating) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const initialAreaIsStandard =
    !!initial?.area && SINGAPORE_AREAS.includes(initial.area);
  const [areaSelect, setAreaSelect] = useState(
    initial?.area == null ? "" : initialAreaIsStandard ? initial.area : "Other",
  );
  const [areaOther, setAreaOther] = useState(
    initial?.area != null && !initialAreaIsStandard ? initial.area : "",
  );
  const [multipleLocations, setMultipleLocations] = useState(initial?.multiple_locations ?? false);
  const [foods, setFoods] = useState<FoodItem[]>(initial?.foods ?? []);
  const [photos, dispatchPhotos] = useReducer(photoReducer, initial?.photo_urls ?? [], initialPhotos);
  const uploading = uploadingCount(photos);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  function addLink() {
    setLinks([...links, { type: "website", url: "" }]);
  }

  function updateLink(index: number, patch: Partial<RestaurantLink>) {
    setLinks(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    const input: RestaurantInput = {
      name,
      maps_url: mapsUrl,
      links,
      cuisine_tags: cuisineTagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      price_range: priceRange || null,
      status,
      rating: rating === "" ? null : Number(rating),
      notes: notes || null,
      area: areaSelect === "Other" ? areaOther.trim() || null : areaSelect || null,
      multiple_locations: multipleLocations,
      foods,
      photo_urls: savedUrls(photos),
    };

    try {
      const result = await onSubmit(input);
      setError(result?.error);
    } catch (err) {
      // A successful submit ends with the action calling redirect(), which
      // surfaces here as a thrown error — rethrow it so Next's own
      // navigation handling still takes over; only a real failure falls
      // through to the generic message below.
      unstable_rethrow(err);
      setError("Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <label>
        Google Maps link
        <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} required />
      </label>

      <div className={styles.fieldRow}>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RestaurantStatus)}
          >
            <option value="wishlist">{STATUS_LABEL.wishlist}</option>
            <option value="tried">{STATUS_LABEL.tried}</option>
          </select>
        </label>

        <label>
          Price
          <select value={priceRange ?? ""} onChange={(e) => setPriceRange(e.target.value)}>
            <option value="">(none)</option>
            <option value="$">$</option>
            <option value="$$">$$</option>
            <option value="$$$">$$$</option>
            <option value="$$$$">$$$$</option>
          </select>
        </label>

        <label>
          Score (1–10)
          <input
            type="number"
            min={1}
            max={10}
            step={1}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
        </label>
      </div>

      <label>
        Cuisine tags (comma-separated)
        <input value={cuisineTagsText} onChange={(e) => setCuisineTagsText(e.target.value)} />
      </label>

      <label>
        Area
        <select value={areaSelect} onChange={(e) => setAreaSelect(e.target.value)}>
          <option value="">(none)</option>
          {SINGAPORE_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      {areaSelect === "Other" && (
        <label>
          Area (custom)
          <input
            value={areaOther}
            onChange={(e) => setAreaOther(e.target.value)}
            placeholder="e.g. Tokyo"
          />
        </label>
      )}
      <label className={styles.checkField}>
        <input
          type="checkbox"
          checked={multipleLocations}
          onChange={(e) => setMultipleLocations(e.target.checked)}
        />
        Multiple locations
      </label>

      <fieldset>
        <legend>Links</legend>
        {links.map((link, i) => (
          <div key={i} className={styles.linkRow}>
            <select
              value={link.type}
              onChange={(e) =>
                updateLink(i, { type: e.target.value as RestaurantLink["type"] })
              }
            >
              <option value="website">Website</option>
              <option value="instagram">Instagram</option>
              <option value="other">Other</option>
            </select>
            <input
              value={link.url}
              onChange={(e) => updateLink(i, { url: e.target.value })}
              placeholder="https://..."
              aria-label={`Link ${i + 1} address`}
            />
            {/* Optional button text; empty shows the type's name. */}
            <input
              value={link.label ?? ""}
              onChange={(e) => updateLink(i, { label: e.target.value })}
              placeholder={defaultLinkLabel(link.type)}
              maxLength={MAX_LINK_LABEL}
              aria-label={`Link ${i + 1} button name`}
            />
            <button type="button" onClick={() => removeLink(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addLink}>
          Add link
        </button>
      </fieldset>

      <label>
        Notes
        <textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <FoodRows foods={foods} onChange={setFoods} />

      <PhotoPicker restaurantId={initial?.id ?? null} items={photos} dispatch={dispatchPhotos} />

      {error && (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        {/* Save waits for uploads, so a photo still in flight isn't lost. */}
        <button type="submit" disabled={pending || uploading > 0}>
          {uploading > 0
            ? `Uploading ${uploading} photo${uploading === 1 ? "" : "s"}…`
            : pending
              ? "Saving…"
              : "Save"}
        </button>
        {actions}
      </div>
    </form>
  );
}
