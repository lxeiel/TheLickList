"use client";

import { ArrowDown, ArrowRight, MapTrifold } from "@phosphor-icons/react";
import { scrollToSection } from "./scrollToSection";
import styles from "./HeroActions.module.css";

// The first screen's two ways on: the map (the main one, filled) or About,
// the menu section just below (outlined). Both glide down the page.
export default function HeroActions() {
  return (
    <div className={styles.row}>
      <button type="button" className={`${styles.pill} ${styles.primary}`} onClick={() => scrollToSection("map")}>
        <MapTrifold size={18} weight="bold" aria-hidden />
        Explore the map
        <ArrowRight size={16} weight="bold" aria-hidden className={styles.nudgeRight} />
      </button>
      <button type="button" className={`${styles.pill} ${styles.secondary}`} onClick={() => scrollToSection("menu")}>
        About
        <ArrowDown size={16} weight="bold" aria-hidden className={styles.nudgeDown} />
      </button>
    </div>
  );
}
