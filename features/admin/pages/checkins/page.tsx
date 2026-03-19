import { Suspense } from "react";
import Link from "next/link";
import { requireAdminWorkspace } from "@/lib/app/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CheckinsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading check-ins...</div>}>
      <CheckinsContent />
    </Suspense>
  );
}

async function CheckinsContent() {
  const { supabase, gym, user } = await requireAdminWorkspace();

  const [{ data: members }, { data: myRole }, { data: myStats }] =
    await Promise.all([
      supabase
        .from("gym_memberships")
        .select("user_id")
        .eq("gym_id", gym.id)
        .eq("status", "active"),
      supabase
        .from("gym_memberships")
        .select("role")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("member_stats")
        .select("total_checkins,current_streak,last_checkin_at")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const memberIds = members?.map((m) => m.user_id) ?? [];
  const isStaff = myRole?.role === "owner" || myRole?.role === "staff";

  const checkinsQuery = supabase
    .from("checkins")
    .select("id,user_id,created_at,source,verified_by_user_id")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const [{ data: profiles }, { data: checkins }] = await Promise.all([
    memberIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", memberIds)
      : Promise.resolve({ data: [] }),
    isStaff ? checkinsQuery : checkinsQuery.eq("user_id", user.id),
  ]);

  const profileMap = new Map(
    profiles?.map((profile) => [profile.id, profile]) ?? [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check-ins</h1>
        <p className="text-sm text-muted-foreground">
          {isStaff
            ? "Check-ins are QR-based for all members."
            : "Use your QR pass when you arrive to keep your streak moving."}
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">
              {isStaff ? "QR-only check-in" : "Your QR check-in"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isStaff
                ? "Members need to open their QR pass to check in. Manual recording is disabled."
                : "Open your QR pass for the scanner when you arrive."}
            </p>
          </div>
          {!isStaff ? (
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div>Total check-ins: {myStats?.total_checkins ?? 0}</div>
              <div>Current streak: {myStats?.current_streak ?? 0} days</div>
              <div>
                Last visit:{" "}
                {myStats?.last_checkin_at
                  ? new Date(myStats.last_checkin_at).toLocaleString()
                  : "No check-ins yet"}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild type="button" variant={isStaff ? "outline" : "default"}>
            <Link href="/admin/checkins/qr">
              {isStaff ? "Preview member QR lane" : "Open QR pass"}
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">
          {isStaff ? "Recent check-ins" : "Your recent check-ins"}
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {checkins?.map((checkin) => {
            const member = profileMap.get(checkin.user_id);
            return (
              <div
                key={checkin.id}
                className="flex items-center justify-between border-b border-border/60 pb-2"
              >
                <div>
                  <div className="text-foreground">
                    {isStaff
                      ? member?.full_name || member?.email || checkin.user_id
                      : "Gym visit"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {checkin.source.toUpperCase()}
                  </div>
                </div>
                <div className="text-xs">
                  {new Date(checkin.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
          {!checkins?.length ? <div>No check-ins yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}
