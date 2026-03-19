"use server";

import { requireAdminPermission } from "@/lib/app/server";
import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";

export async function createClassSession(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  const branchId = String(formData.get("branch_id") || "");
  const capacityValue = String(formData.get("capacity") || "").trim();
  const waitlistCapacityValue = String(formData.get("waitlist_capacity") || "").trim();

  if (!name || !startsAt || !endsAt) {
    throw new Error("Name and times are required.");
  }

  const { supabase, gym, user } = await requireAdminPermission();

  await supabase.from("class_sessions").insert({
    gym_id: gym.id,
    branch_id: branchId || null,
    name,
    starts_at: startsAt,
    ends_at: endsAt,
    capacity: capacityValue ? Number(capacityValue) : null,
    waitlist_capacity: waitlistCapacityValue ? Number(waitlistCapacityValue) : null,
    created_by: user.id,
  });

  revalidateAdminSurface("/admin/classes");
}

export async function markAttendance(formData: FormData) {
  const sessionId = String(formData.get("session_id") || "");
  const userId = String(formData.get("user_id") || "");

  if (!sessionId || !userId) return;

  const { supabase, gym } = await requireAdminPermission();

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id,branch_id")
    .eq("id", sessionId)
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (!session) throw new Error("Session not found.");

  await supabase.from("class_attendance").upsert({
    session_id: sessionId,
    user_id: userId,
    checkin_id: null,
    attended_at: new Date().toISOString(),
  });

  await supabase
    .from("class_bookings")
    .upsert({
      session_id: sessionId,
      user_id: userId,
      status: "booked",
      booked_by_user_id: null,
    }, {
      onConflict: "session_id,user_id",
      ignoreDuplicates: false,
    });

  revalidateAdminSurface("/admin/classes");
  revalidateMemberSurface("/check-in");
}

export async function upsertClassBooking(formData: FormData) {
  const sessionId = String(formData.get("session_id") || "").trim();
  const userId = String(formData.get("user_id") || "").trim();
  const status = String(formData.get("status") || "booked").trim();

  if (!sessionId || !userId) {
    throw new Error("Session and member are required.");
  }

  const { supabase, gym, user } = await requireAdminPermission();

  const { data: session, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id,gym_id")
    .eq("id", sessionId)
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error("Session not found.");
  }

  const { error } = await supabase
    .from("class_bookings")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        status,
        booked_by_user_id: user.id,
      },
      {
        onConflict: "session_id,user_id",
        ignoreDuplicates: false,
      },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/classes");
}

export async function cancelClassBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "").trim();

  if (!bookingId) {
    throw new Error("Booking id is required.");
  }

  const { supabase, gym } = await requireAdminPermission();

  const { error } = await supabase
    .from("class_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .in(
      "session_id",
      (
        await supabase
          .from("class_sessions")
          .select("id")
          .eq("gym_id", gym.id)
      ).data?.map((session) => session.id) ?? [],
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminSurface("/admin/classes");
}
