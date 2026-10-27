import type { RestaurantStatus } from "@/lib/restaurants";
import styles from "./StatusMark.module.css";

export const STATUS_LABEL: Record<RestaurantStatus, string> = {
  tried: "Licked",
  wishlist: "Gotta Lick",
};

// Licked is a filled dot; Gotta Lick is a ring with an empty center. The
// shape (not just color) carries the meaning, and the label is shown
// wherever there's room for it.
export default function StatusMark({
  status,
  size = "sm",
  showLabel = false,
}: {
  status: RestaurantStatus;
  size?: "sm" | "md" | "pin";
  showLabel?: boolean;
}) {
  return (
    <span className={styles.wrap}>
      <span className={`${styles.mark} ${styles[size]} ${styles[status]}`} aria-hidden />
      {showLabel && <span className={styles.label}>{STATUS_LABEL[status]}</span>}
    </span>
  );
}
