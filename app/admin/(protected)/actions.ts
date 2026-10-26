"use server";

import { createRestaurant, validateRestaurantInput, type RestaurantInput } from "@/lib/restaurants";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createRestaurantAction(
  input: RestaurantInput,
): Promise<{ error?: string }> {
  await requireAdmin();

  const validationError = validateRestaurantInput(input);
  if (validationError) {
    return { error: validationError };
  }

  try {
    await createRestaurant(input);
  } catch {
    return { error: "Save failed" };
  }

  redirect("/admin");
}
