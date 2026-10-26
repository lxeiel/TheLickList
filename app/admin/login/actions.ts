"use server";

import { login } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const ok = await login(password);

  if (!ok) {
    return { error: "Invalid credentials" };
  }

  redirect("/admin");
}
