import type { Metadata } from "next";
import StatusMark from "@/app/_components/StatusMark";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main id="content" className={styles.page}>
      <h1 className={styles.title}>About</h1>
      <p className={styles.subtitle}>Lex&apos;s Nomz Adventure</p>

      {/* Lex: rewrite this intro in your own words */}
      <p className={styles.intro}>
        Hi, I&apos;m Lex. This is where I keep track of every place I&apos;ve eaten and every
        place I&apos;m dying to try, mostly around Singapore plus a few spots further afield.
        Have a browse, steal my favourites, and tell me what I&apos;m missing.
      </p>

      <h2 className={styles.heading}>How it works</h2>
      <ul className={styles.key}>
        <li>
          <StatusMark status="tried" size="md" showLabel />
          <span className={styles.meaning}>been there, eaten that</span>
        </li>
        <li>
          <StatusMark status="wishlist" size="md" showLabel />
          <span className={styles.meaning}>on the wishlist</span>
        </li>
        <li>Scores are out of 10.</li>
        <li>Price runs from $ to $$$$.</li>
      </ul>
    </main>
  );
}
