import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export type LeaderboardMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  total_xp: number;
  total_checkins: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_at: string | null;
};

export type ClassAttendanceMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  attendance_count: number;
  last_attended_at: string | null;
};

export type ChallengeParticipantStanding = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  progress_value: number;
  completed_at: string | null;
  joined_at: string;
};

export type ChallengeStanding = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  start_at: string;
  end_at: string;
  target_value: number | null;
  reward_points: number | null;
  participants: ChallengeParticipantStanding[];
};

export const getAuthedUser = cache(async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

export const getActiveGymForUser = cache(async function getActiveGymForUser(
  userId: string,
) {
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
  if (!fallbackGymId) {
    const claimed = await claimOwnedGym(userId);
    return claimed;
  }

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
});

async function claimOwnedGym(userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: ownedGym } = await admin
    .from("gyms")
    .select("id,name,slug,timezone")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ownedGym) return null;

  await admin.from("gym_memberships").upsert(
    {
      gym_id: ownedGym.id,
      user_id: userId,
      role: "owner",
      status: "active",
    },
    { onConflict: "gym_id,user_id" },
  );

  await admin
    .from("profiles")
    .upsert(
      { id: userId, active_gym_id: ownedGym.id },
      { onConflict: "id" },
    );

  return ownedGym as ActiveGym;
}

export const getUserMembershipRole = cache(async function getUserMembershipRole(
  userId: string,
  gymId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_memberships")
    .select("role,status")
    .eq("user_id", userId)
    .eq("gym_id", gymId)
    .maybeSingle();

  return data ?? null;
});

export const getActiveNetworkForUser = cache(async function getActiveNetworkForUser(
  userId: string,
) {
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
});

export const getUserNetworkRole = cache(async function getUserNetworkRole(
  userId: string,
  networkId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("network_memberships")
    .select("role,status")
    .eq("user_id", userId)
    .eq("network_id", networkId)
    .maybeSingle();

  return data ?? null;
});

export const getGymLeaderboardMembers = cache(async function getGymLeaderboardMembers(
  gymId: string,
) {
  const supabase = await createClient();
  const { data: stats } = await supabase
    .from("member_stats")
    .select(
      "user_id,total_xp,total_checkins,current_streak,longest_streak,last_checkin_at",
    )
    .eq("gym_id", gymId);

  if (!stats?.length) {
    return [] as LeaderboardMember[];
  }

  const userIds = Array.from(new Set(stats.map((row) => row.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .in("id", userIds);

  const profileMap = new Map(
    profiles?.map((profile) => [profile.id, profile]) ?? [],
  );

  return stats
    .map((row) => {
      const profile = profileMap.get(row.user_id);
      return {
        id: row.user_id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        total_xp: row.total_xp ?? 0,
        total_checkins: row.total_checkins ?? 0,
        current_streak: row.current_streak ?? 0,
        longest_streak: row.longest_streak ?? 0,
        last_checkin_at: row.last_checkin_at ?? null,
      };
    })
    .filter((row) => row.id);
});

export const getClassAttendanceLeaderboard = cache(
  async function getClassAttendanceLeaderboard(gymId: string) {
    const supabase = await createClient();
    const { data: sessions } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("gym_id", gymId);

    if (!sessions?.length) {
      return [] as ClassAttendanceMember[];
    }

    const sessionIds = sessions.map((session) => session.id);
    const { data: attendance } = await supabase
      .from("class_attendance")
      .select("user_id,attended_at")
      .in("session_id", sessionIds);

    if (!attendance?.length) {
      return [] as ClassAttendanceMember[];
    }

    const counts = new Map<
      string,
      { attendance_count: number; last_attended_at: string | null }
    >();

    for (const row of attendance) {
      const current = counts.get(row.user_id) ?? {
        attendance_count: 0,
        last_attended_at: null,
      };

      const attendedAt = row.attended_at
        ? new Date(row.attended_at).toISOString()
        : null;
      current.attendance_count += 1;
      if (
        attendedAt &&
        (!current.last_attended_at ||
          new Date(attendedAt).getTime() >
            new Date(current.last_attended_at).getTime())
      ) {
        current.last_attended_at = attendedAt;
      }
      counts.set(row.user_id, current);
    }

    const userIds = Array.from(counts.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", userIds);

    const profileMap = new Map(
      profiles?.map((profile) => [profile.id, profile]) ?? [],
    );

    return Array.from(counts.entries())
      .map(([userId, summary]) => {
        const profile = profileMap.get(userId);
        return {
          id: userId,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          attendance_count: summary.attendance_count,
          last_attended_at: summary.last_attended_at,
        };
      })
      .sort((a, b) => {
        if (b.attendance_count !== a.attendance_count) {
          return b.attendance_count - a.attendance_count;
        }
        const aTime = a.last_attended_at
          ? new Date(a.last_attended_at).getTime()
          : 0;
        const bTime = b.last_attended_at
          ? new Date(b.last_attended_at).getTime()
          : 0;
        return bTime - aTime;
      });
  },
);

export const getChallengeStandings = cache(async function getChallengeStandings(
  gymId: string,
) {
  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id,name,description,type,start_at,end_at,target_value,reward_points",
    )
    .eq("gym_id", gymId)
    .order("start_at", { ascending: false });

  if (!challenges?.length) {
    return [] as ChallengeStanding[];
  }

  const challengeIds = challenges.map((challenge) => challenge.id);
  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("challenge_id,user_id,progress_value,completed_at,joined_at")
    .in("challenge_id", challengeIds);

  const userIds = Array.from(
    new Set(participants?.map((participant) => participant.user_id) ?? []),
  );

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    profiles?.map((profile) => [profile.id, profile]) ?? [],
  );

  const participantsByChallenge = new Map<string, ChallengeParticipantStanding[]>();

  for (const participant of participants ?? []) {
    const profile = profileMap.get(participant.user_id);
    const next = participantsByChallenge.get(participant.challenge_id) ?? [];
    next.push({
      user_id: participant.user_id,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      progress_value: participant.progress_value ?? 0,
      completed_at: participant.completed_at ?? null,
      joined_at: participant.joined_at,
    });
    participantsByChallenge.set(participant.challenge_id, next);
  }

  return challenges.map((challenge) => {
    const standings = (participantsByChallenge.get(challenge.id) ?? []).sort(
      (a, b) => {
        if (b.progress_value !== a.progress_value) {
          return b.progress_value - a.progress_value;
        }
        const aCompleted = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bCompleted = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        if (aCompleted !== bCompleted) {
          return aCompleted - bCompleted;
        }
        const aJoined = new Date(a.joined_at).getTime();
        const bJoined = new Date(b.joined_at).getTime();
        return aJoined - bJoined;
      },
    );

    return {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description ?? null,
      type: challenge.type,
      start_at: challenge.start_at,
      end_at: challenge.end_at,
      target_value: challenge.target_value ?? null,
      reward_points: challenge.reward_points ?? null,
      participants: standings,
    };
  });
});
