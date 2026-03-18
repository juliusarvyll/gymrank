"use server";

import { requireActiveGym } from "@/lib/app/server";

export async function generateRetentionAlerts() {
  const { supabase, gym, user } = await requireActiveGym();

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can send retention alerts.");
  }

  const { data: inactiveMembers } = await supabase
    .from("v_inactive_members")
    .select("user_id")
    .eq("gym_id", gym.id);

  if (!inactiveMembers?.length) return;

  const notifications = inactiveMembers.map((row) => ({
    gym_id: gym.id,
    user_id: row.user_id,
    type: "retention",
    title: "We miss you at the gym",
    body: "Jump back in this week to keep your streak alive.",
  }));

  await supabase.from("notifications").insert(notifications);
}
