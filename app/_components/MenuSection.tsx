import Link from "next/link";
// The /ssr build renders in a server component like this one.
import { ArrowCounterClockwise, DiceFive, ForkKnife, NavigationArrow } from "@phosphor-icons/react/ssr";
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
           I&apos;m Lex, and this is my little corner for all things food.
            From hawker stalls and neighbourhood gems to cafes and restaurants, 
            this is where I keep track of the places I&apos;ve eaten, 
            the dishes I&apos;ve loved, and the ones next on my list.
            Singapore for now, the world next. Feel free to steal a few picks and catch me along the way!
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
            <div className={styles.key}>
              <div>
                <h3 className={styles.keyGroup}>On the list</h3>
                <ul className={styles.keyList}>
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
                  <li>
                    <span className={styles.scoreMark} aria-hidden>
                      +
                    </span>
                    <span>
                      <b>Multiple locations</b>, I pin one, U search for the rest
                    </span>
                  </li>
                </ul>
              </div>
              {/* The map's buttons, with the icons they show there. */}
              <div>
                <h3 className={styles.keyGroup}>On the map</h3>
                <ul className={styles.keyList}>
                  <li>
                    <span className={styles.iconMark} aria-hidden>
                      <NavigationArrow weight="bold" className={styles.arrowMark} />
                    </span>
                    <span>
                      <b>Find me</b>, see what&apos;s around you
                    </span>
                  </li>
                  <li>
                    <span className={styles.iconMark} aria-hidden>
                      <ForkKnife weight="bold" />
                    </span>
                    <span>
                      <b>Closest Lick</b> to U
                    </span>
                  </li>
                  <li>
                    <span className={styles.iconMark} aria-hidden>
                      <DiceFive weight="bold" />
                    </span>
                    <span>
                      <b>Surprise Me</b>, can&apos;t decide? I&apos;ll pick a spot for U
                    </span>
                  </li>
                  <li>
                    <span className={styles.iconMark} aria-hidden>
                      <ArrowCounterClockwise weight="bold" />
                    </span>
                    <span>
                      <b>Reset Map</b>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
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
