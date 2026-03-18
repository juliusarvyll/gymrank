"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/app/rewards");
}

export async function redeemReward(formData: FormData) {
  const rewardId = String(formData.get("reward_id") || "");
  if (!rewardId) return;

  const { supabase, user, gym } = await requireActiveGym();

  const [{ data: reward }, { data: stats }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id,name,xp_cost,stock")
      .eq("gym_id", gym.id)
      .eq("id", rewardId)
      .maybeSingle(),
    supabase
      .from("member_stats")
      .select("total_xp")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!reward) {
    throw new Error("Reward not found.");
  }

  if (reward.stock !== null && reward.stock <= 0) {
    throw new Error("Reward is out of stock.");
  }

  if ((stats?.total_xp ?? 0) < reward.xp_cost) {
    throw new Error("Not enough XP to redeem this reward.");
  }

  await supabase.from("reward_redemptions").insert({
    gym_id: gym.id,
    reward_id: rewardId,
    user_id: user.id,
    status: "pending",
  });

  await supabase.from("xp_events").insert({
    gym_id: gym.id,
    user_id: user.id,
    points: -reward.xp_cost,
    reason: `Reward redemption: ${reward.name}`,
    ref_type: "reward_redemption",
  });

  if (reward.stock !== null) {
    await supabase
      .from("rewards")
      .update({ stock: reward.stock - 1 })
      .eq("id", reward.id)
      .eq("gym_id", gym.id);
  }

  revalidatePath("/app/rewards");
  revalidatePath("/app/profile");
  revalidatePath("/app");
  revalidatePath("/member/rewards");
  revalidatePath("/member/profile");
  revalidatePath("/member");
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

  const { data: redemption } = await supabase
    .from("reward_redemptions")
    .select("id,status,user_id,reward_id,rewards(name,xp_cost,stock)")
    .eq("id", redemptionId)
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (!redemption) {
    throw new Error("Redemption not found.");
  }

  await supabase
    .from("reward_redemptions")
    .update({
      status,
      fulfilled_at: status === "fulfilled" ? new Date().toISOString() : null,
    })
    .eq("id", redemptionId);

  const reward = Array.isArray(redemption.rewards)
    ? redemption.rewards[0]
    : redemption.rewards;

  if (redemption.status !== "rejected" && status === "rejected" && reward) {
    await supabase.from("xp_events").insert({
      gym_id: gym.id,
      user_id: redemption.user_id,
      points: reward.xp_cost,
      reason: `Reward refund: ${reward.name}`,
      ref_type: "reward_redemption",
      ref_id: redemption.id,
    });

    if (reward.stock !== null) {
      await supabase
        .from("rewards")
        .update({ stock: reward.stock + 1 })
        .eq("id", redemption.reward_id)
        .eq("gym_id", gym.id);
    }
  }

  revalidatePath("/app/rewards");
  revalidatePath("/app/profile");
  revalidatePath("/app");
}
