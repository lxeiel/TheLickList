import styles from "./page.module.css";
import { checkSupabaseConnection } from "@/lib/supabase";

export default async function Home() {
  const { ok, detail } = await checkSupabaseConnection();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>The Lick List</h1>
        <p>Lex&apos;s Nomz Adventure</p>
        <p>{ok ? "Supabase: connected ✓" : `Supabase: not connected — ${detail}`}</p>
      </main>
    </div>
  );
}
