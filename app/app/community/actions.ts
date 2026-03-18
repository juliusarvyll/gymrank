"use server";

import { requireActiveGym } from "@/lib/app/server";

export async function postShoutout(formData: FormData) {
  const message = String(formData.get("message") || "").trim();
  const targetUserId = String(formData.get("target_user_id") || "");

  if (!message) return;

  const { supabase, user, gym } = await requireActiveGym();

  await supabase.from("activity_events").insert({
    gym_id: gym.id,
    actor_user_id: user.id,
    target_user_id: targetUserId || null,
    event_type: "shoutout",
    data: { message },
  });
}
