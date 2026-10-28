import { listRestaurants } from "@/lib/restaurants";
import { AdminBoard } from "@/app/reborn/AdminBoard";
import { requireAdmin } from "@/lib/auth";

export const instant = false;

export default async function AdminPage() {
  await requireAdmin();
  const restaurants = await listRestaurants();

  return (
    <main>
      <AdminBoard restaurants={restaurants} />
    </main>
  );
}
