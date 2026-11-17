import { listRestaurants } from "@/lib/restaurants";
import { listRecommendations } from "@/lib/recommendations";
import { AdminBoard } from "@/app/reborn/AdminBoard";
import { requireAdmin } from "@/lib/auth";

export const instant = false;

export default async function AdminPage() {
  await requireAdmin();
  // A recs failure shouldn't lock Lex out of the restaurant admin.
  const [restaurants, recommendations] = await Promise.all([
    listRestaurants(),
    listRecommendations().catch((error) => {
      console.error("Couldn't load recommendations", error);
      return [];
    }),
  ]);

  return (
    <main>
      <AdminBoard restaurants={restaurants} recommendations={recommendations} />
    </main>
  );
}
