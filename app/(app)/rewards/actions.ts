"use server";

import { requireActiveGym } from "@/lib/app/server";

export async function createReward(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const xpCost = Number(formData.get("xp_cost") || 0);
  const stock = formData.get("stock");

  if (!name || Number.isNaN(xpCost)) {
    throw new Error("Name and XP cost are required.");
  }

  const { supabase, user, gym } = await requireActiveGym();
  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can create rewards.");
  }

  await supabase.from("rewards").insert({
    gym_id: gym.id,
    name,
    description,
    xp_cost: xpCost,
    stock: stock ? Number(stock) : null,
    created_by: user.id,
  });
}

export async function redeemReward(formData: FormData) {
  const rewardId = String(formData.get("reward_id") || "");
  if (!rewardId) return;

  const { supabase, user, gym } = await requireActiveGym();

  await supabase.from("reward_redemptions").insert({
    gym_id: gym.id,
    reward_id: rewardId,
    user_id: user.id,
    status: "pending",
  });
}

export async function updateRedemptionStatus(formData: FormData) {
  const redemptionId = String(formData.get("redemption_id") || "");
  const status = String(formData.get("status") || "pending");

  const { supabase, gym, user } = await requireActiveGym();
  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can update redemptions.");
  }

  await supabase
    .from("reward_redemptions")
    .update({
      status,
      fulfilled_at: status === "fulfilled" ? new Date().toISOString() : null,
    })
    .eq("id", redemptionId);
}
