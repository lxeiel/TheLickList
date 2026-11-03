import { spotCount } from "@/lib/format";
import HeroActions from "./HeroActions";
import Logo from "./Logo";
import styles from "./Hero.module.css";

// The homepage's first screen: the logo alone in the middle, and at the
// bottom what the site is (a count of spots) over its two ways on, the map
// or About. The navbar stays hidden while this is in view (see SiteNav), so
// this is the first mention of the map.
export default function Hero({ spots }: { spots: number }) {
  return (
    <section id="hero" className={styles.hero}>
      <h1 className={styles.title}>
        <Logo size="hero" />
      </h1>
      <div className={styles.actions}>
        <p className={styles.count}>{spotCount(spots)} across Singapore</p>
        <HeroActions />
      </div>
    </section>
  );
}
