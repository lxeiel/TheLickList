import Link from "next/link";
import { listRestaurants } from "@/lib/restaurants";
import { RestaurantForm } from "@/app/admin/RestaurantForm";
import { requireAdmin } from "@/lib/auth";
import { createRestaurantAction } from "./actions";

export const instant = false;

export default async function AdminPage() {
  await requireAdmin();
  const restaurants = await listRestaurants();

  return (
    <main>
      <h1>Admin</h1>

      <h2>Add a restaurant</h2>
      <RestaurantForm onSubmit={createRestaurantAction} />

      <h2>Restaurants</h2>
      <ul>
        {restaurants.map((restaurant) => (
          <li key={restaurant.id}>
            <Link href={`/admin/restaurants/${restaurant.id}`}>{restaurant.name}</Link> —{" "}
            {restaurant.status}
            {restaurant.area && ` — ${restaurant.area}`}
            {restaurant.lat == null && " — no location set"}
          </li>
        ))}
      </ul>
    </main>
  );
}
