"use server";

import { updateRestaurant, type RestaurantInput } from "@/lib/restaurants";
import { redirect } from "next/navigation";

export async function updateRestaurantAction(
  id: string,
  input: RestaurantInput,
): Promise<{ error?: string }> {
  if (!input.name.trim()) {
    return { error: "Name is required" };
  }

  await updateRestaurant(id, input);
  redirect("/admin");
}
