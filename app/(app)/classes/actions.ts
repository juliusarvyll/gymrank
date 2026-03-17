"use server";

import { requireActiveGym } from "@/lib/app/server";
import { recordCheckin } from "@/lib/app/checkins";

export async function createClassSession(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  const branchId = String(formData.get("branch_id") || "");

  if (!name || !startsAt || !endsAt) {
    throw new Error("Name and times are required.");
  }

  const { supabase, gym, user } = await requireActiveGym();

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can create classes.");
  }

  await supabase.from("class_sessions").insert({
    gym_id: gym.id,
    branch_id: branchId || null,
    name,
    starts_at: startsAt,
    ends_at: endsAt,
    created_by: user.id,
  });
}

export async function markAttendance(formData: FormData) {
  const sessionId = String(formData.get("session_id") || "");
  const userId = String(formData.get("user_id") || "");

  if (!sessionId || !userId) return;

  const { supabase, gym, user } = await requireActiveGym();

  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "staff") {
    throw new Error("Only staff can mark attendance.");
  }

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id,branch_id")
    .eq("id", sessionId)
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (!session) throw new Error("Session not found.");

  const checkinId = await recordCheckin({
    gymId: gym.id,
    userId,
    verifiedByUserId: user.id,
    source: "manual",
    branchId: session.branch_id,
  });

  await supabase.from("class_attendance").upsert({
    session_id: sessionId,
    user_id: userId,
    checkin_id: checkinId,
    attended_at: new Date().toISOString(),
  });
}
