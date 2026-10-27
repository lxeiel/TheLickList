"use client";

import { useState, type FormEvent } from "react";
import { unstable_rethrow } from "next/navigation";
import type { Restaurant, RestaurantInput, RestaurantLink, RestaurantStatus } from "@/lib/restaurants";

const SINGAPORE_AREAS = ["Central", "East", "North", "Northeast", "West"];

export function RestaurantForm({
  initial,
  onSubmit,
}: {
  initial?: Restaurant;
  onSubmit: (input: RestaurantInput) => Promise<{ error?: string }>;
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

      <fieldset>
        <legend>Links</legend>
        {links.map((link, i) => (
          <div key={i}>
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
        Cuisine tags (comma-separated)
        <input value={cuisineTagsText} onChange={(e) => setCuisineTagsText(e.target.value)} />
      </label>

      <label>
        Price range
        <select value={priceRange ?? ""} onChange={(e) => setPriceRange(e.target.value)}>
          <option value="">(none)</option>
          <option value="$">$</option>
          <option value="$$">$$</option>
          <option value="$$$">$$$</option>
          <option value="$$$$">$$$$</option>
        </select>
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

      <label>
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RestaurantStatus)}
        >
          <option value="wishlist">Want to try</option>
          <option value="tried">Tried</option>
        </select>
      </label>

      <label>
        Rating
        <input
          type="number"
          min={1}
          max={10}
          step={1}
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />
      </label>

      <label>
        Notes
        <textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button type="submit" disabled={pending}>
        Save
      </button>
      {error && <p>{error}</p>}
    </form>
  );
}
