"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveGym } from "@/lib/app/server";

export async function addMember(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");
  const tier = String(formData.get("tier") || "").trim();

  if (!email) {
    throw new Error("Email is required.");
  }

  const { gym, supabase, user } = await requireActiveGym();

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can add members.");
  }

  const isOwner = membership?.role === "owner";
  const admin = createAdminClient();

  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to add members by email.",
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError || !profile?.id) {
    throw new Error(profileError?.message || "User not found.");
  }

  const userId = profile.id;

  const { error: membershipError } = await admin.from("gym_memberships").insert({
    gym_id: gym.id,
    user_id: userId,
    role: isOwner ? role : "member",
    status: "active",
    tier: isOwner && tier ? tier : null,
    invited_by: user.id,
  });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  await admin
    .from("profiles")
    .update({ active_gym_id: gym.id })
    .eq("id", userId)
    .is("active_gym_id", null);

  revalidatePath("/app/members");
}

export async function updateMemberAccess(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const status = String(formData.get("status") || "active");
  const role = String(formData.get("role") || "member");
  const tier = String(formData.get("tier") || "").trim();

  const { gym, supabase, user } = await requireActiveGym();

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can update member access.");
  }

  const updatePayload: {
    status: string;
    role?: string;
    tier?: string | null;
  } = { status };

  if (membership.role === "owner") {
    updatePayload.role = role;
    updatePayload.tier = tier || null;
  }

  await supabase
    .from("gym_memberships")
    .update(updatePayload)
    .eq("gym_id", gym.id)
    .eq("user_id", userId);

  revalidatePath("/app/members");
}
