import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertGymPlanOwnership(
  supabase: SupabaseClient,
  gymId: string,
  planId: string | null,
) {
  if (!planId) {
    return;
  }

  const { data: plan, error } = await supabase
    .from("membership_plans")
    .select("id")
    .eq("id", planId)
    .eq("gym_id", gymId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!plan) {
    throw new Error("Selected plan does not belong to this gym.");
  }
}

export async function assertGymMemberOwnership(
  supabase: SupabaseClient,
  gymId: string,
  userId: string,
) {
  const { data: membership, error } = await supabase
    .from("gym_memberships")
    .select("user_id")
    .eq("gym_id", gymId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership) {
    throw new Error("Selected member does not belong to this gym.");
  }
}

export function buildInvoiceNumber() {
  return `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
