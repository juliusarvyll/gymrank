"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/lib/app/server";
import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";
import { assertGymPlanOwnership } from "@/lib/app/membership-admin";

export async function addMember(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const requestedRole = String(formData.get("role") || "member");
  const planId = String(formData.get("plan_id") || "").trim() || null;

  if (!email) {
    throw new Error("Email is required.");
  }

  const { gym, role: adminRole, user } = await requireAdminPermission();
  const isOwner = adminRole.role === "owner";
  const admin = createAdminClient();

  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to add members by email.");
  }

  await assertGymPlanOwnership(admin, gym.id, isOwner ? planId : null);

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
    role: isOwner ? requestedRole : "member",
    status: "active",
    plan_id: isOwner ? planId : null,
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

  revalidateAdminSurface("/admin/members", "/admin/billing", "/admin/membership-plans");
  revalidateMemberSurface("/", "/profile");
}

export async function updateMemberAccess(formData: FormData) {
  const userId = String(formData.get("user_id") || "").trim();
  const status = String(formData.get("status") || "active").trim();
  const requestedRole = String(formData.get("role") || "member").trim();
  const planId = String(formData.get("plan_id") || "").trim() || null;

  if (!userId) {
    throw new Error("User id is required.");
  }

  const { gym, role: adminRole, supabase } = await requireAdminPermission();

  const updatePayload: {
    status: string;
    role?: string;
    plan_id?: string | null;
  } = { status };

  if (adminRole.role === "owner") {
    await assertGymPlanOwnership(supabase, gym.id, planId);
    updatePayload.role = requestedRole;
    updatePayload.plan_id = planId;
  }

  const { error } = await supabase
    .from("gym_memberships")
    .update(updatePayload)
    .eq("gym_id", gym.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/members", "/admin/billing", "/admin/membership-plans");
  revalidateMemberSurface("/", "/profile");
}
