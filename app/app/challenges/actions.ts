"use server";

import { revalidatePath } from "next/cache";
import { requireActiveGym } from "@/lib/app/server";
import { sendChallengeCompletionNotification } from "@/app/app/notifications/actions";

export async function createChallenge(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const type = String(formData.get("type") || "checkins");
  const startAt = String(formData.get("start_at") || "");
  const endAt = String(formData.get("end_at") || "");
  const targetValue = Number(formData.get("target_value") || 0);
  const rewardPoints = Number(formData.get("reward_points") || 0);

  if (!name || !startAt || !endAt) {
    throw new Error("Challenge name and dates are required.");
  }

  const { supabase, user, gym } = await requireActiveGym();
  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can create challenges.");
  }

  const { error } = await supabase.from("challenges").insert({
    gym_id: gym.id,
    name,
    description,
    type,
    start_at: startAt,
    end_at: endAt,
    target_value: Number.isNaN(targetValue) ? null : targetValue,
    reward_points: Number.isNaN(rewardPoints) ? 0 : rewardPoints,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/app/challenges");
}

export async function joinChallenge(formData: FormData) {
  const challengeId = String(formData.get("challenge_id") || "");
  if (!challengeId) return;

  const { supabase, user } = await requireActiveGym();

  const { data: existingParticipant } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingParticipant) {
    revalidatePath("/app/challenges");
    return;
  }

  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    user_id: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/app/challenges");
}

export async function completeChallenge(formData: FormData) {
  const challengeId = String(formData.get("challenge_id") || "");
  const userId = String(formData.get("user_id") || "");
  if (!challengeId || !userId) return;

  const { supabase, gym, user } = await requireActiveGym();
  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can complete challenges.");
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("name,reward_points,reward_badge_id")
    .eq("id", challengeId)
    .maybeSingle();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("completed_at")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) {
    throw new Error("Participant not found for this challenge.");
  }

  if (participant?.completed_at) {
    revalidatePath("/app/challenges");
    return;
  }

  await supabase
    .from("challenge_participants")
    .update({ completed_at: new Date().toISOString() })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId);

  if (challenge?.reward_points && challenge.reward_points > 0) {
    await supabase.from("xp_events").insert({
      gym_id: gym.id,
      user_id: userId,
      points: challenge.reward_points,
      reason: "Challenge completion",
      ref_type: "challenge",
      ref_id: challengeId,
    });
  }

  if (challenge?.reward_badge_id) {
    await supabase.from("user_badges").insert({
      gym_id: gym.id,
      user_id: userId,
      badge_id: challenge.reward_badge_id,
    });
  }

  if (challenge) {
    await sendChallengeCompletionNotification(supabase, {
      gymId: gym.id,
      userId,
      challengeId,
      challengeName: challenge.name,
      rewardPoints: challenge.reward_points,
    });
  }

  revalidatePath("/app/challenges");
  revalidatePath("/app/notifications");
}
