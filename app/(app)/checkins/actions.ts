"use server";

import { requireActiveGym } from "@/lib/app/server";
import { recordCheckin } from "@/lib/app/checkins";

export async function createCheckin(formData: FormData) {
  const providedUserId = String(formData.get("user_id") || "");
  const notes = String(formData.get("notes") || "");
  const source = String(formData.get("source") || "manual");

  const { user, gym } = await requireActiveGym();
  const userId = providedUserId || user.id;

  await recordCheckin({
    gymId: gym.id,
    userId,
    verifiedByUserId: user.id,
    source: source === "qr" ? "qr" : "manual",
    notes,
  });
}
