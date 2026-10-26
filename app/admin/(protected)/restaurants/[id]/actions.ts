"use server";

import { updateRestaurant, validateRestaurantInput, type RestaurantInput } from "@/lib/restaurants";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function updateRestaurantAction(
  id: string,
  input: RestaurantInput,
): Promise<{ error?: string }> {
  await requireAdmin();

  const validationError = validateRestaurantInput(input);
  if (validationError) {
    return { error: validationError };
  }

  try {
    await updateRestaurant(id, input);
  } catch {
    return { error: "Save failed" };
  }

  redirect("/admin");
}
