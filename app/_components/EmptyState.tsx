import styles from "./EmptyState.module.css";

export default function EmptyState({ kind, onClear }: { kind: "no-matches" | "no-data"; onClear?: () => void }) {
  if (kind === "no-data") return <p className={styles.empty}>The list is empty, for now.</p>;
  return (
    <div className={styles.empty}>
      <p>Nothing matches — try another search</p>
      {onClear && (
        <button type="button" className={styles.clear} onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
