import { listRestaurants } from "@/lib/restaurants";
import { listRecommendations } from "@/lib/recommendations";
import { AdminBoard } from "@/app/reborn/AdminBoard";
import { requireAdmin } from "@/lib/auth";

export const instant = false;

export default async function AdminPage() {
  await requireAdmin();
  const [restaurants, recommendations] = await Promise.all([listRestaurants(), listRecommendations()]);

  return (
    <main>
      <AdminBoard restaurants={restaurants} recommendations={recommendations} />
    </main>
  );
}
