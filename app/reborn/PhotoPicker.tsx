"use client";

import { useRef, useState, type Dispatch } from "react";
import { ArrowLeft, ArrowRight, Plus, X } from "@phosphor-icons/react";
import { createLimiter } from "@/lib/limit";
import { MAX_PHOTOS } from "@/lib/photos";
import type { PhotoAction, PhotoItem } from "@/lib/photoUploads";
import { createPhotoUploadAction } from "./(protected)/actions";
import { shrinkPhoto, UNREADABLE_PHOTO } from "./shrinkPhoto";
import styles from "./admin.module.css";

// Food pics in the restaurant popup. Each picked photo is shrunk, then
// uploaded straight to Supabase through a one-time link; the form saves only
// the ones that finished.
export function PhotoPicker({
  restaurantId,
  items,
  dispatch,
}: {
  restaurantId: string | null;
  items: PhotoItem[];
  dispatch: Dispatch<PhotoAction>;
}) {
  const input = useRef<HTMLInputElement>(null);
  // The original files, kept so a failed upload can be retried.
  const files = useRef(new Map<string, File>());
  // Two at a time: decoding a dozen full-size phone photos at once can run a
  // phone out of memory and take the whole form down with it.
  const [queue] = useState(() => createLimiter(2));

  async function upload(key: string) {
    const file = files.current.get(key);
    if (!file) return;
    try {
      const blob = await shrinkPhoto(file);
      const link = await createPhotoUploadAction(restaurantId);
      if ("error" in link) throw new Error(link.error);
      const response = await fetch(link.uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "content-type": "image/jpeg" },
      });
      if (!response.ok) throw new Error("Upload failed");
      files.current.delete(key);
      dispatch({ type: "uploaded", key, url: link.publicUrl });
    } catch (error) {
      const message = error instanceof Error && error.message === UNREADABLE_PHOTO ? UNREADABLE_PHOTO : "Upload failed";
      dispatch({ type: "failed", key, error: message });
    }
  }

  function pick(picked: FileList | null) {
    const room = MAX_PHOTOS - items.length;
    for (const file of Array.from(picked ?? []).slice(0, Math.max(room, 0))) {
      const key = crypto.randomUUID();
      files.current.set(key, file);
      dispatch({ type: "add", key, preview: URL.createObjectURL(file) });
      void queue(() => upload(key));
    }
    if (input.current) input.current.value = "";
  }

  return (
    <fieldset>
      <legend>Food pics</legend>
      {items.length > 0 && (
        <ul className={styles.photoGrid}>
          {items.map((item, i) => (
            <li key={item.key} className={styles.photoTile} data-status={item.status}>
              {/* eslint-disable-next-line @next/next/no-img-element -- photos are already resized before upload */}
              <img src={item.url ?? item.preview} alt={`Photo ${i + 1}`} />
              {item.status === "uploading" && <span className={styles.photoSpinner} aria-label="Uploading" />}
              {item.status === "error" && (
                <span className={styles.photoError}>
                  {item.error}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "retry", key: item.key });
                      void queue(() => upload(item.key));
                    }}
                  >
                    Retry
                  </button>
                </span>
              )}
              <span className={styles.photoControls}>
                <button
                  type="button"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => dispatch({ type: "move", key: item.key, by: -1 })}
                >
                  <ArrowLeft size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move photo ${i + 1} later`}
                  disabled={i === items.length - 1}
                  onClick={() => dispatch({ type: "move", key: item.key, by: 1 })}
                >
                  <ArrowRight size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => {
                    files.current.delete(item.key);
                    dispatch({ type: "remove", key: item.key });
                  }}
                >
                  <X size={14} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {items.length < MAX_PHOTOS && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            hidden
            onChange={(e) => pick(e.target.files)}
          />
          <button type="button" className={styles.addPhotos} onClick={() => input.current?.click()}>
            Add photos
            <Plus size={16} aria-hidden />
          </button>
        </>
      )}
    </fieldset>
  );
}
