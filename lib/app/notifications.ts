import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";

export async function markNotificationReadInGym(
  supabase: Pick<SupabaseClient, "from">,
  notificationId: string,
) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/notifications");
  revalidateMemberSurface("/notifications");
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

  revalidateAdminSurface("/admin/notifications");
  revalidateMemberSurface("/notifications");
  return true;
}
