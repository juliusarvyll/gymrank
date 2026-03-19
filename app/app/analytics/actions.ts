"use server";

import { requireAdminPermission } from "@/lib/app/server";

export async function generateRetentionAlerts() {
  const { supabase, gym } = await requireAdminPermission();

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
