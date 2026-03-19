"use server";

import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";
import { requireMemberGym } from "@/lib/app/server";

export async function postMemberShoutout(formData: FormData) {
  const message = String(formData.get("message") || "").trim();
  const targetUserId = String(formData.get("target_user_id") || "");

  if (!message) return;

  const { supabase, user, gym } = await requireMemberGym();
  const { error } = await supabase.from("activity_events").insert({
    gym_id: gym.id,
    actor_user_id: user.id,
    target_user_id: targetUserId || null,
    event_type: "shoutout",
    data: { message },
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateMemberSurface("/", "/community");
  revalidateAdminSurface("/admin/community");
}

export async function toggleMemberActivityReaction(formData: FormData) {
  const activityEventId = String(formData.get("activity_event_id") || "");
  if (!activityEventId) return;

  const { supabase, user, gym } = await requireMemberGym();

  const { data: existingReaction, error: lookupError } = await supabase
    .from("activity_reactions")
    .select("id")
    .eq("activity_event_id", activityEventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existingReaction) {
    const { error } = await supabase
      .from("activity_reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("activity_reactions").insert({
      gym_id: gym.id,
      activity_event_id: activityEventId,
      user_id: user.id,
      reaction_type: "like",
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidateMemberSurface("/", "/community");
  revalidateAdminSurface("/admin/community");
}

export async function addMemberActivityComment(formData: FormData) {
  const activityEventId = String(formData.get("activity_event_id") || "");
  const body = String(formData.get("body") || "").trim();

  if (!activityEventId || !body) return;

  const { supabase, user, gym } = await requireMemberGym();
  const { error } = await supabase.from("activity_comments").insert({
    gym_id: gym.id,
    activity_event_id: activityEventId,
    user_id: user.id,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateMemberSurface("/", "/community");
  revalidateAdminSurface("/admin/community");
}
