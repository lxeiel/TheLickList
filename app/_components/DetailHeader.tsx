"use client";

import { ArrowLeft, X } from "@phosphor-icons/react";
import styles from "./DetailHeader.module.css";

// backOnPhoneOnly: in the List page's popup the ✕ already closes it on wide
// screens, so "All spots" only shows in the phone sheet and the ✕ moves up
// into the corner beside the name.
export default function DetailHeader({
  onBack,
  onClose,
  backOnPhoneOnly = false,
}: {
  onBack: () => void;
  onClose: () => void;
  backOnPhoneOnly?: boolean;
}) {
  return (
    <div className={styles.header} data-back-phone-only={backOnPhoneOnly || undefined}>
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
