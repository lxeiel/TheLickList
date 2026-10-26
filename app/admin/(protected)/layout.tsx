import { requireAdmin } from "@/lib/auth";

// Admin routes read the session cookie to gate access, so they can never be
// statically prerendered — always render per-request.
export const instant = false;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
