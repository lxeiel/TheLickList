import styles from "./ScoreGuide.module.css";

// What each score means, best first.
const TIERS: { score: string; verdict?: string; detail: string }[] = [
  { score: "8+", verdict: "Obsessed", detail: "I'll keep coming back" },
  { score: "7", verdict: "Memorable", detail: "food I'll think about after" },
  { score: "6", verdict: "Solid", detail: "can't go wrong" },
  { score: "5", verdict: "Meh", detail: "didn't live up to expectations" },
  { score: "<5", detail: "Doesn't make the list" },
];

// The contents of the "How I score" popover, shown from the homepage's
// legend and from the map's buttons. No hooks, so it renders on either side.
export default function ScoreGuide() {
  return (
    <>
      <h4 className={styles.title}>How I score</h4>
      <ul className={styles.tiers}>
        {TIERS.map(({ score, verdict, detail }) => (
          <li key={score}>
            <span className={styles.score}>{score}</span>
            <span>
              {verdict && <b>{verdict}</b>}
              {verdict && ", "}
              {detail}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
