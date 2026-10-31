"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "@phosphor-icons/react";
import { formatAdded, formatMeta, formatScore } from "@/lib/format";
import { sortFoodsForDisplay } from "@/lib/foods";
import { linkLabel } from "@/lib/links";
import type { Restaurant } from "@/lib/restaurants";
import Notes from "./Notes";
import PhotoStrip from "./PhotoStrip";
import StatusMark from "./StatusMark";
import styles from "./RestaurantDetail.module.css";

const Dot = () => (
  <span className={styles.dot} aria-hidden>
    ·
  </span>
);

// Shared by the Map page's pane/sheet and the List page's popup/sheet; only
// the container around it differs. A future /r/[id] page would reuse it too.
// layout="popup" gives the List page's wide-screen popup roomier spacing and
// larger photos, and leaves space beside the name for the corner ✕.
export default function RestaurantDetail({
  restaurant: r,
  showOnMapHref,
  layout,
}: {
  restaurant: Restaurant;
  showOnMapHref?: string;
  layout?: "popup";
}) {
  const score = formatScore(r);
  const meta = formatMeta(r);
  const links = r.links.filter((link) => link.url);

  return (
    <article className={styles.detail} data-layout={layout}>
      <h2 className={styles.name}>{r.name}</h2>

      {/* Status and score, then area, cuisine, price and so on, on one line.
          Each dot sticks to the item before it, so a wrapped line starts with
          an item rather than a stray dot. */}
      <p className={styles.summary}>
        <span className={styles.part}>
          <span className={styles.status}>
            <StatusMark status={r.status} size="md" showLabel />
            {score && <span className={styles.score}>{score}</span>}
          </span>
          {meta.length > 0 && <Dot />}
        </span>
        {meta.map((item, i) => (
          <Fragment key={item}>
            {" "}
            <span className={`${styles.part} ${styles.metaItem}`}>
              {item}
              {i < meta.length - 1 && <Dot />}
            </span>
          </Fragment>
        ))}
      </p>

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

      {(r.maps_url || links.length > 0 || showOnMapHref) && (
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
          {showOnMapHref && (
            <Link className={styles.secondary} href={showOnMapHref}>
              <MapPin size={16} aria-hidden />
              Show on map
            </Link>
          )}
        </div>
      )}

      {r.lat == null && !showOnMapHref && <p className={styles.muted}>No map location yet</p>}

      <p className={styles.muted}>Added {formatAdded(r.created_at)}</p>
    </article>
  );
}
