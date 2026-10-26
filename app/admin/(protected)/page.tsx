import Link from "next/link";
import { listRestaurants } from "@/lib/restaurants";
import { RestaurantForm } from "@/app/admin/RestaurantForm";
import { createRestaurantAction } from "./actions";

export const instant = false;

export default async function AdminPage() {
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
          </li>
        ))}
      </ul>
    </main>
  );
}
