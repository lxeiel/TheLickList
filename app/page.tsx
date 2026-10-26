import { Suspense } from "react";
import styles from "./page.module.css";
import { checkSupabaseConnection } from "@/lib/supabase";

async function SupabaseStatus() {
  const { ok, detail } = await checkSupabaseConnection();
  return <p>{ok ? "Supabase: connected ✓" : `Supabase: not connected — ${detail}`}</p>;
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>The Lick List</h1>
        <p>Lex&apos;s Nomz Adventure</p>
        <Suspense fallback={<p>Supabase: checking…</p>}>
          <SupabaseStatus />
        </Suspense>
      </main>
    </div>
  );
}
