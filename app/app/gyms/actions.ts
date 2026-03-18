"use server";

import { requireActiveGym } from "@/lib/app/server";
import { createClient } from "@/lib/supabase/server";

export async function setActiveGym(formData: FormData) {
  const gymId = String(formData.get("gym_id") || "");
  if (!gymId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("profiles").update({ active_gym_id: gymId }).eq("id", user.id);
}

export async function updateGymProfile(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const timezone = String(formData.get("timezone") || "").trim();

  const { supabase, gym } = await requireActiveGym();

  await supabase
    .from("gyms")
    .update({ name, timezone })
    .eq("id", gym.id);
}

export async function addBranch(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!name) return;

  const { supabase, gym } = await requireActiveGym();

  await supabase.from("gym_branches").insert({
    gym_id: gym.id,
    name,
    address: address ? { text: address } : null,
  });
}
