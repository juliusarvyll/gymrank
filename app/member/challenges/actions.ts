"use server";

import { revalidateAdminSurface, revalidateMemberSurface } from "@/lib/app/revalidate";
import { requireMemberGym } from "@/lib/app/server";

export async function joinMemberChallenge(formData: FormData) {
  const challengeId = String(formData.get("challenge_id") || "");
  if (!challengeId) return;

  const { supabase, user } = await requireMemberGym();

  const { data: existingParticipant, error: existingError } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existingParticipant) {
    const { error } = await supabase.from("challenge_participants").insert({
      challenge_id: challengeId,
      user_id: user.id,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidateMemberSurface("/", "/challenges");
  revalidateAdminSurface("/admin/challenges");
}
