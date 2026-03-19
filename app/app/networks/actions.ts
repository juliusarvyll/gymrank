"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/app/server";
import { revalidateAdminSurface } from "@/lib/app/revalidate";

async function requireNetworkAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, networkId: string) {
  const { data: membership, error } = await supabase
    .from("network_memberships")
    .select("role,status")
    .eq("network_id", networkId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new Error("Only network admins can manage this network.");
  }
}

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

  const { supabase, user } = await requireAdminPermission();
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

  revalidateAdminSurface("/admin/networks", "/admin/inter-gym");

  redirect("/admin/networks");
}

export async function setActiveNetwork(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  if (!networkId) return;

  const { user } = await requireAdminPermission();
  const supabase = await createClient();

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

  revalidateAdminSurface("/admin/networks", "/admin/inter-gym");
}

export async function addGymToNetwork(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  const gymId = String(formData.get("gym_id") || "");
  if (!networkId || !gymId) return;

  const { supabase, user } = await requireAdminPermission();
  await requireNetworkAdmin(supabase, user.id, networkId);

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

  revalidateAdminSurface("/admin/networks", "/admin/inter-gym");
}

export async function addNetworkMember(formData: FormData) {
  const networkId = String(formData.get("network_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");

  if (!networkId || !email) return;

  const { supabase, user } = await requireAdminPermission();
  await requireNetworkAdmin(supabase, user.id, networkId);
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

  revalidateAdminSurface("/admin/networks", "/admin/inter-gym");
}
