"use server";

import { markNotificationReadInGym } from "@/lib/app/notifications";
import { requireMemberGym } from "@/lib/app/server";

export async function markMemberNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") || "");
  if (!notificationId) return;

  const { supabase } = await requireMemberGym();
  await markNotificationReadInGym(supabase, notificationId);
}
