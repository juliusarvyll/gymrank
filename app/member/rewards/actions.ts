"use server";

import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";
import { requireMemberGym } from "@/lib/app/server";

export async function redeemMemberReward(formData: FormData) {
  const rewardId = String(formData.get("reward_id") || "");
  if (!rewardId) return;

  const { supabase, user, gym } = await requireMemberGym();

  const [{ data: reward, error: rewardError }, { data: stats, error: statsError }] =
    await Promise.all([
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

  if (rewardError) {
    throw new Error(rewardError.message);
  }

  if (statsError) {
    throw new Error(statsError.message);
  }

  if (!reward) {
    throw new Error("Reward not found.");
  }

  if (reward.stock !== null && reward.stock <= 0) {
    throw new Error("Reward is out of stock.");
  }

  if ((stats?.total_xp ?? 0) < reward.xp_cost) {
    throw new Error("Not enough XP to redeem this reward.");
  }

  const { error: redemptionError } = await supabase.from("reward_redemptions").insert({
    gym_id: gym.id,
    reward_id: rewardId,
    user_id: user.id,
    status: "pending",
  });

  if (redemptionError) {
    throw new Error(redemptionError.message);
  }

  const { error: xpError } = await supabase.from("xp_events").insert({
    gym_id: gym.id,
    user_id: user.id,
    points: -reward.xp_cost,
    reason: `Reward redemption: ${reward.name}`,
    ref_type: "reward_redemption",
  });

  if (xpError) {
    throw new Error(xpError.message);
  }

  if (reward.stock !== null) {
    const { error } = await supabase
      .from("rewards")
      .update({ stock: reward.stock - 1 })
      .eq("id", reward.id)
      .eq("gym_id", gym.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidateMemberSurface("/", "/rewards", "/profile");
  revalidateAdminSurface("/admin/rewards", "/admin/profile");
}
