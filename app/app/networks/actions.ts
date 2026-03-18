"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to create networks.",
    );
  }

  const { data: network, error } = await supabase
    .from("gym_networks")
    .insert({ name, slug, created_by: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { error: membershipError } = await admin
    .from("network_memberships")
    .insert({
      network_id: network.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ active_network_id: network.id })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/app/networks");
  revalidatePath("/app/inter-gym");

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

  const { data: membership, error: membershipError } = await supabase
    .from("network_memberships")
    .select("network_id")
    .eq("network_id", networkId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    throw new Error("You are not an active member of that network.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_network_id: networkId })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/networks");
  revalidatePath("/app/inter-gym");
}

export async function addGymToNetwork(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  const gymId = String(formData.get("gym_id") || "");
  if (!networkId || !gymId) return;

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("network_gyms").upsert(
    {
      network_id: networkId,
      gym_id: gymId,
      added_by: user.id,
    },
    { onConflict: "network_id,gym_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/networks");
  revalidatePath("/app/inter-gym");
}

export async function addNetworkMember(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");

  if (!networkId || !email) return;

  await requireUser();
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to invite network members.",
    );
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error || !profile?.id) {
    throw new Error(error?.message || "User not found.");
  }

  const { error: membershipError } = await admin
    .from("network_memberships")
    .upsert(
      {
        network_id: networkId,
        user_id: profile.id,
        role,
        status: "active",
      },
      { onConflict: "network_id,user_id" },
    );

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  revalidatePath("/app/networks");
  revalidatePath("/app/inter-gym");
}
