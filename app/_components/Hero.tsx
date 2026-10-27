import Logo from "./Logo";
import ScrollDownButton from "./ScrollDownButton";
import styles from "./Hero.module.css";

// The homepage's first screen: just the logo. The navbar stays hidden while
// this is in view (see SiteNav).
export default function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      <h1 className={styles.title}>
        <Logo size="hero" />
      </h1>
      <div className={styles.down}>
        <ScrollDownButton target="map" label="See the map" />
      </div>
    </section>
  );
}
