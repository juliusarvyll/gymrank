import { Suspense } from "react";
import { requireAdminWorkspace } from "@/lib/app/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateRetentionAlerts } from "@/app/app/analytics/actions";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}

async function AnalyticsContent() {
  const { supabase, gym } = await requireAdminWorkspace();

  const { data: challengeIds } = await supabase
    .from("challenges")
    .select("id")
    .eq("gym_id", gym.id);

  const [
    { data: weeklyAttendance },
    { data: inactiveMembers },
    { count: activeMembers },
    { count: challengeParticipants },
  ] = await Promise.all([
    supabase
      .from("v_weekly_attendance")
      .select("week_start,checkins")
      .eq("gym_id", gym.id)
      .order("week_start", { ascending: false })
      .limit(8),
    supabase
      .from("v_inactive_members")
      .select("user_id,last_checkin_at")
      .eq("gym_id", gym.id),
    supabase
      .from("gym_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("status", "active"),
    challengeIds?.length
      ? supabase
          .from("challenge_participants")
          .select("user_id", { count: "exact", head: true })
          .in(
            "challenge_id",
            challengeIds.map((c) => c.id),
          )
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Attendance, engagement, and retention insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Active members
          </div>
          <div className="text-2xl font-semibold">{activeMembers ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Challenge participants
          </div>
          <div className="text-2xl font-semibold">
            {challengeParticipants ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            At-risk members
          </div>
          <div className="text-2xl font-semibold">
            {inactiveMembers?.length ?? 0}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-2">
        <h2 className="text-sm font-semibold">Exports</h2>
        <p className="text-sm text-muted-foreground">
          Download raw data for gym reporting.
        </p>
        <a
          href="/api/exports/checkins"
          className="text-sm text-primary underline"
        >
          Download check-ins CSV
        </a>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-sm font-semibold">Weekly attendance</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          {weeklyAttendance?.map((row) => (
            <div key={row.week_start} className="flex justify-between">
              <span>
                {new Date(row.week_start).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>{row.checkins} check-ins</span>
            </div>
          ))}
          {!weeklyAttendance?.length ? (
            <div>No attendance data yet.</div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-sm font-semibold">At-risk members</h2>
        <form action={generateRetentionAlerts}>
          <Button size="sm" type="submit">
            Send retention nudges
          </Button>
        </form>
        <div className="space-y-2 text-sm text-muted-foreground">
          {inactiveMembers?.map((row) => (
            <div key={row.user_id} className="flex justify-between">
              <span>{row.user_id}</span>
              <span>
                Last check-in{" "}
                {row.last_checkin_at
                  ? new Date(row.last_checkin_at).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
          ))}
          {!inactiveMembers?.length ? <div>No inactive members.</div> : null}
        </div>
      </Card>
    </div>
  );
}
