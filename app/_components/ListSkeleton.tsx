import styles from "./ListSkeleton.module.css";

// Placeholder while restaurants load: the nav comes from the layout, the map
// area keeps its size on desktop so nothing jumps when it arrives.
export default function ListSkeleton({ variant = "map" }: { variant?: "map" | "list" }) {
  return (
    <div className={styles.page} data-variant={variant} aria-busy="true" aria-label="Loading">
      <div className={styles.bar} />
      <div className={styles.body}>
        <div className={styles.map} />
        <ul className={styles.rows}>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <span className={styles.line} style={{ width: `${60 + ((i * 13) % 30)}%` }} />
              <span className={styles.lineShort} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
