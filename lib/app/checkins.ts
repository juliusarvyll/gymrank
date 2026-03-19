import { createClient } from "@/lib/supabase/server";
import { sendChallengeCompletionNotification } from "@/lib/app/notifications";
import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";

type RecordCheckinInput = {
  gymId: string;
  userId: string;
  verifiedByUserId?: string | null;
  source?: "manual" | "qr";
  notes?: string | null;
  branchId?: string | null;
};

export async function recordCheckin(input: RecordCheckinInput) {
  const supabase = await createClient();
  const { data: gymChallenges } = await supabase
    .from("challenges")
    .select("id,name,reward_points")
    .eq("gym_id", input.gymId);

  const challengeIds = gymChallenges?.map((challenge) => challenge.id) ?? [];
  const { data: beforeCompletions } = challengeIds.length
    ? await supabase
        .from("challenge_participants")
        .select("challenge_id,completed_at")
        .eq("user_id", input.userId)
        .in("challenge_id", challengeIds)
    : { data: [] };

  const { data: checkin, error } = await supabase
    .from("checkins")
    .insert({
      gym_id: input.gymId,
      user_id: input.userId,
      verified_by_user_id: input.verifiedByUserId ?? null,
      source: input.source ?? "manual",
      notes: input.notes ?? null,
      branch_id: input.branchId ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("xp_events").insert({
    gym_id: input.gymId,
    user_id: input.userId,
    points: 10,
    reason: "Check-in",
    ref_type: "checkin",
    ref_id: checkin.id,
  });

  await supabase.from("activity_events").insert({
    gym_id: input.gymId,
    actor_user_id: input.verifiedByUserId ?? input.userId,
    target_user_id: input.userId,
    event_type: "checkin",
    data: { source: input.source ?? "manual" },
  });

  const { data: afterCompletions } = challengeIds.length
    ? await supabase
        .from("challenge_participants")
        .select("challenge_id,completed_at")
        .eq("user_id", input.userId)
        .in("challenge_id", challengeIds)
    : { data: [] };

  const beforeMap = new Map(
    beforeCompletions?.map((row) => [row.challenge_id, row.completed_at]) ?? [],
  );
  const newlyCompleted =
    afterCompletions?.filter((row) => {
      const previous = beforeMap.get(row.challenge_id);
      return row.completed_at && row.completed_at !== previous;
    }) ?? [];

  for (const completion of newlyCompleted) {
    const challenge = gymChallenges?.find((row) => row.id === completion.challenge_id);
    if (!challenge) continue;

    await sendChallengeCompletionNotification(supabase, {
      gymId: input.gymId,
      userId: input.userId,
      challengeId: challenge.id,
      challengeName: challenge.name,
      rewardPoints: challenge.reward_points,
    });
  }

  if (newlyCompleted.length) {
    revalidateAdminSurface("/admin/challenges", "/admin/notifications");
    revalidateMemberSurface("/", "/challenges", "/notifications");
  }

  return checkin.id as string;
}

export async function createCheckinToken(gymId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkin_tokens")
    .insert({
      gym_id: gymId,
      user_id: userId,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select("token,expires_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function consumeCheckinToken(token: string, userId: string) {
  const supabase = await createClient();
  const { data: tokenRow, error } = await supabase
    .from("checkin_tokens")
    .select("token,gym_id,user_id,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !tokenRow) {
    throw new Error("Invalid token.");
  }

  if (tokenRow.user_id !== userId) {
    throw new Error("Token does not belong to this user.");
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    throw new Error("Token expired.");
  }

  const checkinId = await recordCheckin({
    gymId: tokenRow.gym_id,
    userId: tokenRow.user_id,
    verifiedByUserId: userId,
    source: "qr",
  });

  await supabase.from("checkin_tokens").delete().eq("token", tokenRow.token);

  return checkinId;
}
