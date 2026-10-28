import styles from "./admin.module.css";

// Admin isn't redesigned (see the frontend redesign spec), but the site-wide
// reset strips buttons and inputs bare; this restores visible, usable
// controls and some spacing on the admin pages.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.admin}>{children}</div>;
}
