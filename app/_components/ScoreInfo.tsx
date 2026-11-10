import type { ReactNode } from "react";
// The /ssr build renders in a server component like this one.
import { Info } from "@phosphor-icons/react/ssr";
import { Dropdown } from "./MultiSelect";
import ScoreGuide from "./ScoreGuide";
import styles from "./ScoreInfo.module.css";

// A legend line (its children) followed by a small ⓘ that shows the score
// guide on hover, or on a tap or click. The popover hangs off the whole
// line, not the icon, so it has the line's width to work with on a phone.
export default function ScoreInfo({ children }: { children: ReactNode }) {
  return (
    <div className={styles.line}>
      {children}{" "}
      <Dropdown
        label="How I score"
        trigger={
          <>
            <Info weight="bold" aria-hidden />
            <span className="visually-hidden">How I score</span>
          </>
        }
        rootClassName={styles.root}
        buttonClassName={styles.button}
        panelClassName={styles.panel}
        openOnHover
      >
        <ScoreGuide />
      </Dropdown>
    </div>
  );
}
