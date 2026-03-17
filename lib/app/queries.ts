import { createClient } from "@/lib/supabase/server";

export type ActiveGym = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

export type ActiveNetwork = {
  id: string;
  name: string;
  slug: string;
};

export async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getActiveGymForUser(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_gym_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.active_gym_id) {
    const { data: gym } = await supabase
      .from("gyms")
      .select("id,name,slug,timezone")
      .eq("id", profile.active_gym_id)
      .maybeSingle();
    return gym as ActiveGym | null;
  }

  const { data: memberships } = await supabase
    .from("gym_memberships")
    .select("gym_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1);

  const fallbackGymId = memberships?.[0]?.gym_id;
  if (!fallbackGymId) return null;

  await supabase
    .from("profiles")
    .update({ active_gym_id: fallbackGymId })
    .eq("id", userId);

  const { data: gym } = await supabase
    .from("gyms")
    .select("id,name,slug,timezone")
    .eq("id", fallbackGymId)
    .maybeSingle();

  return gym as ActiveGym | null;
}

export async function getUserMembershipRole(userId: string, gymId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_memberships")
    .select("role,status")
    .eq("user_id", userId)
    .eq("gym_id", gymId)
    .maybeSingle();

  return data ?? null;
}

export async function getActiveNetworkForUser(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_network_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.active_network_id) {
    const { data: network } = await supabase
      .from("gym_networks")
      .select("id,name,slug")
      .eq("id", profile.active_network_id)
      .maybeSingle();
    return network as ActiveNetwork | null;
  }

  const { data: memberships } = await supabase
    .from("network_memberships")
    .select("network_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1);

  const fallbackNetworkId = memberships?.[0]?.network_id;
  if (!fallbackNetworkId) return null;

  await supabase
    .from("profiles")
    .update({ active_network_id: fallbackNetworkId })
    .eq("id", userId);

  const { data: network } = await supabase
    .from("gym_networks")
    .select("id,name,slug")
    .eq("id", fallbackNetworkId)
    .maybeSingle();

  return network as ActiveNetwork | null;
}

export async function getUserNetworkRole(userId: string, networkId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("network_memberships")
    .select("role,status")
    .eq("user_id", userId)
    .eq("network_id", networkId)
    .maybeSingle();

  return data ?? null;
}
