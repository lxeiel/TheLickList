import Link from "next/link";
import { buildMenuList, countByStatus } from "@/lib/menu";
import type { Restaurant } from "@/lib/restaurants";
import { CONTACT_LINKS } from "@/lib/site";
import ScrollDownButton from "./ScrollDownButton";
import StatusMark from "./StatusMark";
import styles from "./MenuSection.module.css";

// The homepage's second section, laid out like an index or menu: plain
// headings over plain lists, one typeface, the grid doing the organising.
export default function MenuSection({ restaurants }: { restaurants: Restaurant[] }) {
  const list = buildMenuList(restaurants);
  const counts = countByStatus(restaurants);
  const contact = CONTACT_LINKS.filter((link) => link.href);

  return (
    <section id="menu" className={styles.section} aria-label="About The Lick List">
      <div className={styles.grid}>
        <div className={styles.about}>
          <h2 className={styles.heading}>About</h2>
          {/* Lex: rewrite this intro in your own words */}
          <p className={styles.intro}>
            Hi, I&apos;m Lex. This is where I keep every place I&apos;ve eaten and every place I&apos;m
            dying to try: mostly hawker stalls and neighbourhood spots around Singapore, plus a few
            further afield whenever I travel. Steal my favourites, and tell me what I&apos;m missing.
          </p>
        </div>

        <div className={styles.list}>
          <h2 className={styles.heading}>The list</h2>
          {list.length === 0 ? (
            <p>Nothing here yet.</p>
          ) : (
            <ul className={styles.names}>
              {list.map(({ restaurant, crossedOff }) => (
                <li key={restaurant.id}>
                  <Link
                    href={`/?spot=${restaurant.id}#map`}
                    className={crossedOff ? styles.crossed : undefined}
                    aria-label={crossedOff ? `${restaurant.name}, licked` : `${restaurant.name}, gotta lick`}
                  >
                    {restaurant.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/list" className={styles.more}>
            See the full list
          </Link>
        </div>

        <div className={styles.how}>
          <div>
            <h2 className={styles.heading}>How it works</h2>
            <ul className={styles.key}>
              <li>
                <StatusMark status="tried" size="md" />
                <span>
                  <b>Licked</b>, been there, eaten that
                </span>
              </li>
              <li>
                <StatusMark status="wishlist" size="md" />
                <span>
                  <b>Gotta Lick</b>, on the wishlist
                </span>
              </li>
              <li>
                <span className={styles.scoreMark} aria-hidden>
                  9/10
                </span>
                <span>
                  <b>Scores</b>, out of 10
                </span>
              </li>
            </ul>
          </div>
          {contact.length > 0 && (
            <div>
              <h2 className={styles.heading}>Contact</h2>
              <ul>
                {contact.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.numbers}>
          <h2 className={styles.heading}>By the numbers</h2>
          <p className={styles.line}>
            <span className={styles.num}>{counts.tried}</span> Licked
          </p>
          <p className={styles.line}>
            <span className={styles.num}>{counts.wishlist}</span> Gotta Lick
          </p>
        </div>
      </div>

      <div className={styles.down}>
        <ScrollDownButton target="map" label="Scroll to the map" />
      </div>
    </section>
  );
}
