import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>The Lick List</h1>
        <p>Lex&apos;s Nomz Adventure</p>
      </main>
    </div>
  );
}
