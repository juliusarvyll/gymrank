"use server";

import { requireActiveGym } from "@/lib/app/server";
import { getActiveNetworkForUser } from "@/lib/app/queries";

export async function createNetworkChallenge(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const type = String(formData.get("type") || "checkins");
  const startAt = String(formData.get("start_at") || "");
  const endAt = String(formData.get("end_at") || "");
  const targetValue = Number(formData.get("target_value") || 0);

  if (!name || !startAt || !endAt) {
    throw new Error("Name and dates are required.");
  }

  const { supabase, user } = await requireActiveGym();
  const network = await getActiveNetworkForUser(user.id);
  if (!network) throw new Error("No active network.");

  const { data: membership } = await supabase
    .from("network_memberships")
    .select("role")
    .eq("network_id", network.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new Error("Only network admins can create challenges.");
  }

  const { error } = await supabase.from("network_challenges").insert({
    network_id: network.id,
    name,
    description,
    type,
    start_at: startAt,
    end_at: endAt,
    target_value: Number.isNaN(targetValue) ? null : targetValue,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
}

export async function joinNetworkChallenge(formData: FormData) {
  const challengeId = String(formData.get("challenge_id") || "");
  if (!challengeId) return;

  const { supabase, gym } = await requireActiveGym();

  await supabase.from("network_challenge_participants").insert({
    challenge_id: challengeId,
    gym_id: gym.id,
  });
}
