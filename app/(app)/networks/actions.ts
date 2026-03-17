"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/app/server";

export async function createNetwork(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!name || !slug) {
    throw new Error("Network name and slug are required.");
  }

  const { supabase, user } = await requireUser();

  const { data: network, error } = await supabase
    .from("gym_networks")
    .insert({ name, slug, created_by: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("network_memberships").insert({
    network_id: network.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  await supabase
    .from("profiles")
    .update({ active_network_id: network.id })
    .eq("id", user.id);

  redirect("/app/networks");
}

export async function setActiveNetwork(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  if (!networkId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ active_network_id: networkId })
    .eq("id", user.id);
}

export async function addGymToNetwork(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  const gymId = String(formData.get("gym_id") || "");
  if (!networkId || !gymId) return;

  const { supabase, user } = await requireUser();

  await supabase.from("network_gyms").insert({
    network_id: networkId,
    gym_id: gymId,
    added_by: user.id,
  });
}

export async function addNetworkMember(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");

  if (!networkId || !email) return;

  const { supabase } = await requireUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error || !profile?.id) {
    throw new Error(error?.message || "User not found.");
  }

  await supabase.from("network_memberships").insert({
    network_id: networkId,
    user_id: profile.id,
    role,
    status: "active",
  });
}
