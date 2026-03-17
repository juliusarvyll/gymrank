import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymForUser } from "@/lib/app/queries";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const gym = await getActiveGymForUser(user.id);
  if (!gym) redirect("/app/onboarding");

  const [{ count: memberCount }, { count: checkinCount }] = await Promise.all([
    supabase
      .from("gym_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("status", "active"),
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gym.id),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Engagement snapshot for {gym.name}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Members</div>
          <div className="text-2xl font-semibold">{memberCount ?? 0}</div>
          <div className="text-xs text-muted-foreground">Active members</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Check-ins
          </div>
          <div className="text-2xl font-semibold">{checkinCount ?? 0}</div>
          <div className="text-xs text-muted-foreground">All-time</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Your XP</div>
          <div className="text-2xl font-semibold">
            {stats?.total_xp ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">
            Streak {stats?.current_streak ?? 0} days
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
          <h2 className="text-sm font-semibold">Next actions</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Create your first challenge to drive check-ins.</li>
            <li>Invite staff members to confirm check-ins.</li>
            <li>Set reward catalog to reinforce streaks.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
