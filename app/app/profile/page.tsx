import { Suspense } from "react";
import { requireActiveGym } from "@/lib/app/server";
import { updateProfile } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function getLevel(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

function getLevelProgress(totalXp: number) {
  return totalXp % 100;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const { supabase, user, gym } = await requireActiveGym();

  const [
    { data: profile },
    { data: stats },
    { data: membership },
    { data: badgeAwards },
    { data: xpEvents },
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,email")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("member_stats")
        .select("total_xp,total_checkins,current_streak,longest_streak")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("gym_memberships")
        .select("role,status,joined_at")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_badges")
        .select("id,awarded_at,badges(name,description,icon)")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .order("awarded_at", { ascending: false }),
      supabase
        .from("xp_events")
        .select("id,points,reason,created_at")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const totalXp = stats?.total_xp ?? 0;
  const level = getLevel(totalXp);
  const levelProgress = getLevelProgress(totalXp);
  const xpToNextLevel = 100 - levelProgress;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep your profile and activity stats up to date.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Profile details</h2>
        <form action={updateProfile} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {profile?.email}
          </div>
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase text-muted-foreground">Stats</div>
            <Badge variant="secondary">Level {level}</Badge>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Level progress</span>
                <span className="font-medium text-foreground">
                  {levelProgress} / 100 XP
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-foreground/80"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {xpToNextLevel === 100 ? 0 : xpToNextLevel} XP to next level
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              XP: {totalXp}
              <br />
              Check-ins: {stats?.total_checkins ?? 0}
              <br />
              Current streak: {stats?.current_streak ?? 0}
              <br />
              Longest streak: {stats?.longest_streak ?? 0}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Membership</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Role: {membership?.role ?? "member"}
            <br />
            Status: {membership?.status ?? "active"}
            <br />
            Joined:{" "}
            {membership?.joined_at
              ? new Date(membership.joined_at).toLocaleDateString()
              : "-"}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Badges</h2>
            <Badge variant="outline">{badgeAwards?.length ?? 0} earned</Badge>
          </div>
          {badgeAwards?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {badgeAwards.map((award) => {
                const badge = Array.isArray(award.badges)
                  ? award.badges[0]
                  : award.badges;

                return (
                  <div
                    key={award.id}
                    className="rounded-md border border-border/60 p-3"
                  >
                    <div className="font-medium">
                      {badge?.icon ? `${badge.icon} ` : ""}
                      {badge?.name ?? "Badge"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {badge?.description || "Awarded by your gym."}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Earned {new Date(award.awarded_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No badges yet. Complete challenges and stay consistent to unlock them.
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Recent XP activity</h2>
            <Badge variant="outline">{totalXp} total XP</Badge>
          </div>
          {xpEvents?.length ? (
            <div className="space-y-2">
              {xpEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">{event.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={event.points >= 0 ? "secondary" : "outline"}>
                    {event.points >= 0 ? "+" : ""}
                    {event.points} XP
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              XP activity will appear here after your first check-in or reward redemption.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
