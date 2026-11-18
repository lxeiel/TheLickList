import type { Metadata } from "next";
import styles from "./admin.module.css";

// Keeps the admin and its login page out of search results. Not listed in a
// robots.txt instead: that file is public and would advertise the path.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Admin isn't redesigned (see the frontend redesign spec), but the site-wide
// reset strips buttons and inputs bare; this restores visible, usable
// controls and some spacing on the admin pages.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.admin}>{children}</div>;
}
