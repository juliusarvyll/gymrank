"use server";

import { requireActiveGym } from "@/lib/app/server";

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") || "");
  if (!notificationId) return;

  const { supabase } = await requireActiveGym();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
}
