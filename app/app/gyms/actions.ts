"use server";

import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/app/server";
import { createClient } from "@/lib/supabase/server";

export async function setActiveGym(formData: FormData) {
  const gymId = String(formData.get("gym_id") || "");
  if (!gymId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: membership, error } = await supabase
    .from("gym_memberships")
    .select("role,status")
    .eq("gym_id", gymId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership) {
    throw new Error("You are not an active member of that gym.");
  }

  await supabase.from("profiles").update({ active_gym_id: gymId }).eq("id", user.id);

  redirect(membership.role === "owner" || membership.role === "staff" ? "/admin" : "/");
}

export async function updateGymProfile(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const timezone = String(formData.get("timezone") || "").trim();

  const { supabase, gym } = await requireAdminPermission();

  await supabase
    .from("gyms")
    .update({ name, timezone })
    .eq("id", gym.id);
}

export async function addBranch(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!name) return;

  const { supabase, gym } = await requireAdminPermission();

  await supabase.from("gym_branches").insert({
    gym_id: gym.id,
    name,
    address: address ? { text: address } : null,
  });
}
