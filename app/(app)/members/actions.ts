"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveGym } from "@/lib/app/server";

export async function addMember(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "member");

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
    role,
    status: "active",
  });

  if (membershipError) {
    throw new Error(membershipError.message);
  }
}

export async function updateMemberStatus(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const status = String(formData.get("status") || "active");

  const { gym, supabase, user } = await requireActiveGym();

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can update member status.");
  }

  await supabase
    .from("gym_memberships")
    .update({ status })
    .eq("gym_id", gym.id)
    .eq("user_id", userId);
}
