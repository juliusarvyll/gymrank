"use server";

import { revalidatePath } from "next/cache";
import { requireActiveGym } from "@/lib/app/server";
import { recordCheckin } from "@/lib/app/checkins";

export async function createCheckin(formData: FormData) {
  const providedUserId = String(formData.get("user_id") || "");
  const notes = String(formData.get("notes") || "");
  const source = String(formData.get("source") || "manual");

  const { supabase, user, gym } = await requireActiveGym();
  const userId = providedUserId || user.id;

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isStaff = membership?.role === "owner" || membership?.role === "staff";

  if (!isStaff && userId !== user.id) {
    throw new Error("Members can only create check-ins for themselves.");
  }

  await recordCheckin({
    gymId: gym.id,
    userId,
    verifiedByUserId: user.id,
    source: source === "qr" ? "qr" : "manual",
    notes,
  });

  revalidatePath("/app/checkins");
  revalidatePath("/app");
}
