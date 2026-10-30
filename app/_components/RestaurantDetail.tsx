"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "@phosphor-icons/react";
import { formatAdded, formatScore } from "@/lib/format";
import { sortFoodsForDisplay } from "@/lib/foods";
import { linkLabel } from "@/lib/links";
import type { Restaurant } from "@/lib/restaurants";
import Notes from "./Notes";
import PhotoStrip from "./PhotoStrip";
import StatusMark from "./StatusMark";
import styles from "./RestaurantDetail.module.css";

// Shared by the Map page's pane/sheet and the List page's drawer/sheet; only
// the container around it differs. A future /r/[id] page would reuse it too.
export default function RestaurantDetail({
  restaurant: r,
  showOnMapHref,
}: {
  restaurant: Restaurant;
  showOnMapHref?: string;
}) {
  const score = formatScore(r);
  const meta = [r.area, r.cuisine_tags.length > 0 ? r.cuisine_tags.join(", ") : null, r.price_range].filter(Boolean);
  const links = r.links.filter((link) => link.url);

  return (
    <article className={styles.detail}>
      <h2 className={styles.name}>{r.name}</h2>

      <p className={styles.status}>
        <StatusMark status={r.status} size="md" showLabel />
        {score && <span className={styles.score}>{score}</span>}
      </p>

      {meta.length > 0 && (
        <p className={styles.meta}>
          {meta.map((item) => (
            <span key={item as string}>{item}</span>
          ))}
        </p>
      )}

      <PhotoStrip urls={r.photo_urls} name={r.name} />

      {/* Keyed so a different spot starts collapsed again. */}
      {r.notes && <Notes key={r.id} text={r.notes} />}

      {r.foods.length > 0 && (
        <section className={styles.foods} aria-label="Food tried">
          <h3 className={styles.label}>Food tried</h3>
          <ul>
            {sortFoodsForDisplay(r.foods).map((food, i) => (
              <li key={i} data-must-try={food.must_try || undefined}>
                <span className={styles.foodName}>
                  {food.name}
                  {food.must_try && <span className={styles.mustTry}>Must try</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(r.maps_url || links.length > 0) && (
        <div className={styles.actions}>
          {r.maps_url && (
            <a className={styles.primary} href={r.maps_url} target="_blank" rel="noopener noreferrer">
              Open in Google Maps
              <ArrowUpRight size={16} aria-hidden />
            </a>
          )}
          {links.map((link, i) => (
            <a key={i} className={styles.secondary} href={link.url} target="_blank" rel="noopener noreferrer">
              {linkLabel(link)}
              <ArrowUpRight size={16} aria-hidden />
            </a>
          ))}
        </div>
      )}

      {showOnMapHref && (
        <Link className={styles.secondary} href={showOnMapHref}>
          <MapPin size={16} aria-hidden />
          Show on map
        </Link>
      )}

      {r.lat == null && !showOnMapHref && <p className={styles.muted}>No map location yet</p>}

      <p className={styles.muted}>Added {formatAdded(r.created_at)}</p>
    </article>
  );
}
