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
          <h2 className={styles.heading}>About Me</h2>
          <p className={styles.intro}>
           I&apos;m Lex, and I&apos;m always hungry, always on the hunt for my next good meal.
           From hawker stalls to hidden cafes and restaurants worth the hype, 
           this is where I keep track of the good stuff. Singapore for now, the world next.
           Steal my picks, and maybe I&apos;ll catch you at one of them.
          </p>
          {contact.length > 0 && (
            <div className={styles.contactBlock}>
              <h2 className="visually-hidden">Contact</h2>
              <ul className={styles.contact}>
                {contact.map((link) => (
                  <li key={link.label}>
                    {/* Web links open in a new tab; mailto: would leave a blank one behind. */}
                    <a
                      href={link.href}
                      {...(link.href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
                    >
                      <span className={styles.contactLabel}>{link.label}</span> - {link.detail}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              <li>
                <span className={styles.scoreMark} aria-hidden>
                  $$
                </span>
                <span>
                  <b>Price</b>, runs from $ to $$$$
                </span>
              </li>
            </ul>
          </div>
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
