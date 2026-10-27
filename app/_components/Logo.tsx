import styles from "./Logo.module.css";

const LABEL = "The Lick List by Lex";

// The wordmark. "hero" stacks "Lick" over "List" so their "Li"s line up;
// "nav" is one line. The full stop is the site's own Licked dot, and "by lex"
// is a handwritten signature. Screen readers get one plain label.
export default function Logo({ size }: { size: "hero" | "nav" }) {
  if (size === "nav") {
    return (
      <span className={styles.nav}>
        <span className="visually-hidden">{LABEL}</span>
        <span className={styles.navWord} aria-hidden>
          The Lick List<span className={styles.dot} />
        </span>
        <span className={styles.navSig} aria-hidden>
          by lex
        </span>
      </span>
    );
  }

  return (
    <span className={styles.hero}>
      <span className="visually-hidden">{LABEL}</span>
      <span className={styles.the} aria-hidden>
        The
      </span>
      <span aria-hidden>Lick</span>
      <span aria-hidden>
        List<span className={styles.dot} />
      </span>
      <span className={styles.heroSig} aria-hidden>
        by lex
      </span>
    </span>
  );
}
