import { Suspense } from "react";
import { requireActiveGym } from "@/lib/app/server";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const { supabase, user, gym } = await requireActiveGym();

  const [
    { count: memberCount },
    { count: checkinCount },
    { data: membership },
    { data: unreadNotifications },
    { data: myChallenges },
    { data: myRewardRedemptions },
  ] = await Promise.all([
    supabase
      .from("gym_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("status", "active"),
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gym.id),
    supabase
      .from("gym_memberships")
      .select("role")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("challenge_participants")
      .select("challenge_id,progress_value,completed_at,challenges(name,target_value,end_at)")
      .eq("user_id", user.id)
      .limit(3),
    supabase
      .from("reward_redemptions")
      .select("id,status,created_at,rewards(name)")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const { data: stats } = await supabase
    .from("member_stats")
    .select("total_xp,total_checkins,current_streak")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: activity } = await supabase
    .from("activity_events")
    .select("id,event_type,data,created_at")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const isStaff = membership?.role === "owner" || membership?.role === "staff";
  const level = Math.floor((stats?.total_xp ?? 0) / 100) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {isStaff
            ? `Engagement snapshot for ${gym.name}.`
            : `Your training momentum in ${gym.name}.`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            {isStaff ? "Members" : "Your Level"}
          </div>
          <div className="text-2xl font-semibold">
            {isStaff ? memberCount ?? 0 : level}
          </div>
          <div className="text-xs text-muted-foreground">
            {isStaff ? "Active members" : `${stats?.total_xp ?? 0} total XP`}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            {isStaff ? "Check-ins" : "Your Check-ins"}
          </div>
          <div className="text-2xl font-semibold">
            {isStaff ? checkinCount ?? 0 : stats?.total_checkins ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">
            {isStaff ? "All-time" : "Visits recorded"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            {isStaff ? "Your XP" : "Your Streak"}
          </div>
          <div className="text-2xl font-semibold">
            {isStaff ? stats?.total_xp ?? 0 : stats?.current_streak ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">
            {isStaff
              ? `Streak ${stats?.current_streak ?? 0} days`
              : `${unreadNotifications?.length ?? 0} unread notifications`}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            {activity?.length ? (
              activity.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.event_type}</span>
                  <span>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div>No activity yet.</div>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">
            {isStaff ? "Next actions" : "Your active items"}
          </h2>
          {isStaff ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Create your first challenge to drive check-ins.</li>
              <li>Invite staff members to confirm check-ins.</li>
              <li>Set reward catalog to reinforce streaks.</li>
            </ul>
          ) : (
            <div className="mt-3 space-y-3">
              {myChallenges?.length ? (
                myChallenges.map((entry) => {
                  const challenge = Array.isArray(entry.challenges)
                    ? entry.challenges[0]
                    : entry.challenges;

                  return (
                    <div
                      key={entry.challenge_id}
                      className="rounded-md border border-border/60 p-3 text-sm"
                    >
                      <div className="font-medium text-foreground">
                        {challenge?.name ?? "Challenge"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Progress {entry.progress_value}
                        {challenge?.target_value ? ` / ${challenge.target_value}` : ""}
                        {entry.completed_at ? " • Completed" : ""}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">
                  Join a challenge to start earning progress here.
                </div>
              )}

              {myRewardRedemptions?.map((redemption) => {
                const reward = Array.isArray(redemption.rewards)
                  ? redemption.rewards[0]
                  : redemption.rewards;

                return (
                  <div
                    key={redemption.id}
                    className="rounded-md border border-border/60 p-3 text-sm"
                  >
                    <div className="font-medium text-foreground">
                      {reward?.name ?? "Reward"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {redemption.status} •{" "}
                      {new Date(redemption.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
