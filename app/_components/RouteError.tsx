"use client";

import styles from "./RouteError.module.css";

export default function RouteError({ retry }: { retry: () => void }) {
  return (
    <main id="content" className={styles.error}>
      <p>Couldn&apos;t load the list right now</p>
      <button type="button" className={styles.retry} onClick={retry}>
        Try again
      </button>
    </main>
  );
}
