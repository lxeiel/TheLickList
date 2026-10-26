import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/restaurants";
import { RestaurantForm } from "@/app/admin/RestaurantForm";
import { requireAdmin } from "@/lib/auth";
import { updateRestaurantAction } from "./actions";

export const instant = false;

export default async function EditRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const restaurant = await getRestaurant(id);

  if (!restaurant) {
    notFound();
  }

  return (
    <main>
      <h1>Edit restaurant</h1>
      <RestaurantForm initial={restaurant} onSubmit={updateRestaurantAction.bind(null, id)} />
    </main>
  );
}
