"use server";

import { requireActiveGym } from "@/lib/app/server";

export async function updateProfile(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();

  const { supabase, user } = await requireActiveGym();

  await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
}
