"use server";

import { createRestaurant, type RestaurantInput } from "@/lib/restaurants";
import { redirect } from "next/navigation";

export async function createRestaurantAction(
  input: RestaurantInput,
): Promise<{ error?: string }> {
  if (!input.name.trim()) {
    return { error: "Name is required" };
  }

  await createRestaurant(input);
  redirect("/admin");
}
