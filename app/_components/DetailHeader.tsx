"use client";

import { ArrowLeft, X } from "@phosphor-icons/react";
import styles from "./DetailHeader.module.css";

export default function DetailHeader({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <div className={styles.header}>
      <button type="button" className={styles.back} onClick={onBack} data-detail-back>
        <ArrowLeft size={16} aria-hidden />
        All spots
      </button>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <X size={20} aria-hidden />
      </button>
    </div>
  );
}
