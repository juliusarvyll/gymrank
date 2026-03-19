"use server";

import { requireAdminPermission } from "@/lib/app/server";
import { markNotificationReadInGym } from "@/lib/app/notifications";

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notification_id") || "");
  if (!notificationId) return;

  const { supabase } = await requireAdminPermission();
  await markNotificationReadInGym(supabase, notificationId);
}
