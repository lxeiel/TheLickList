import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import styles from "@/app/reborn/admin.module.css";
import { logoutAction } from "./actions";

// Admin routes read the session cookie to gate access, so they can never be
// statically prerendered — always render per-request.
export const instant = false;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <div className={styles.adminBar}>
        <Link href="/reborn" className={styles.adminHome}>
          Admin
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={styles.logout}>
            Log out
          </button>
        </form>
      </div>
      {children}
    </>
  );
}
