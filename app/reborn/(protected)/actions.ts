"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  createRestaurant,
  deleteRestaurant,
  markLicked,
  updateRestaurant,
  validateRestaurantInput,
  type RestaurantInput,
} from "@/lib/restaurants";
import { logout, requireAdmin } from "@/lib/auth";
import { createPhotoUpload } from "@/lib/photoStorage";

// The admin edits in a popup over the list, so these return a result (the
// popup closes on success) and refresh the list rather than redirecting.

export async function createRestaurantAction(input: RestaurantInput): Promise<{ error?: string }> {
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

  refresh();
  return {};
}

export async function updateRestaurantAction(id: string, input: RestaurantInput): Promise<{ error?: string }> {
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

  refresh();
  return {};
}

export async function markLickedAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    await markLicked(id);
  } catch {
    return { error: "Couldn't move it to Licked" };
  }

  refresh();
  return {};
}

export async function deleteRestaurantAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    await deleteRestaurant(id);
  } catch {
    return { error: "Delete failed" };
  }

  refresh();
  return {};
}

// A one-time upload link for one food pic; the browser uploads straight to
// it. Admin-only: actions can be called from any page, not just /reborn.
export async function createPhotoUploadAction(
  restaurantId: string | null,
): Promise<{ uploadUrl: string; publicUrl: string } | { error: string }> {
  await requireAdmin();

  try {
    return await createPhotoUpload(restaurantId);
  } catch {
    return { error: "Couldn't start the upload" };
  }
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/reborn/login");
}
