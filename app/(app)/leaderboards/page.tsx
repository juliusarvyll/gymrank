import { requireActiveGym } from "@/lib/app/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function LeaderboardsPage() {
  const { supabase, gym } = await requireActiveGym();

  const { data: stats } = await supabase
    .from("member_stats")
    .select("user_id,total_xp,total_checkins,current_streak")
    .eq("gym_id", gym.id)
    .order("total_xp", { ascending: false })
    .limit(50);

  const userIds = stats?.map((s) => s.user_id) ?? [];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    profiles?.map((profile) => [profile.id, profile]) ?? [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leaderboards</h1>
        <p className="text-sm text-muted-foreground">
          Track top performers by XP, streaks, and check-ins.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Top members</h2>
        <div className="space-y-3">
          {stats?.map((row, index) => {
            const profile = profileMap.get(row.user_id);
            return (
              <div
                key={row.user_id}
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium">
                    #{index + 1}{" "}
                    {profile?.full_name || profile?.email || row.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Check-ins {row.total_checkins} · Streak {row.current_streak}
                  </div>
                </div>
                <Badge variant="secondary">{row.total_xp} XP</Badge>
              </div>
            );
          })}
          {!stats?.length ? (
            <div className="text-sm text-muted-foreground">
              No leaderboard data yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
