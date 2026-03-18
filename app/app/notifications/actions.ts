"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveGym } from "@/lib/app/server";

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") || "");
  if (!notificationId) return;

  const { supabase } = await requireActiveGym();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  revalidatePath("/app/notifications");
}

type ChallengeCompletionNotificationInput = {
  gymId: string;
  userId: string;
  challengeId: string;
  challengeName: string;
  rewardPoints?: number | null;
};

export async function sendChallengeCompletionNotification(
  supabase: Pick<SupabaseClient, "from">,
  input: ChallengeCompletionNotificationInput,
) {
  const { data: existing } = await supabase
    .from("notifications")
    .select("id,data")
    .eq("gym_id", input.gymId)
    .eq("user_id", input.userId)
    .eq("type", "challenge");

  const alreadyNotified = existing?.some(
    (row: { data?: { challenge_id?: string } | null }) =>
      row.data?.challenge_id === input.challengeId,
  );

  if (alreadyNotified) {
    return false;
  }

  const rewardLine =
    input.rewardPoints && input.rewardPoints > 0
      ? ` You earned ${input.rewardPoints} XP.`
      : "";

  const { error } = await supabase.from("notifications").insert({
    gym_id: input.gymId,
    user_id: input.userId,
    type: "challenge",
    title: "Challenge completed",
    body: `${input.challengeName} has been completed.${rewardLine}`,
    data: {
      challenge_id: input.challengeId,
      challenge_name: input.challengeName,
      reward_points: input.rewardPoints ?? 0,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/notifications");
  return true;
}
