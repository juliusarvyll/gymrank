import { Suspense } from "react";
import { Flame, Medal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireActiveGym } from "@/lib/app/server";
import { updateProfile } from "@/app/app/profile/actions";

function getLevel(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

function getLevelProgress(totalXp: number) {
  return totalXp % 100;
}

export default function MemberProfilePage() {
  return (
    <Suspense fallback={<div className="rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">Loading profile...</div>}>
      <MemberProfileContent />
    </Suspense>
  );
}

async function MemberProfileContent() {
  const { supabase, user, gym } = await requireActiveGym();

  const [{ data: profile }, { data: stats }, { data: membership }, { data: badgeAwards }, { data: xpEvents }] =
    await Promise.all([
      supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
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
  const progress = getLevelProgress(totalXp);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_46%,#7c3aed_155%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.22)] sm:p-8">
        <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100">
          Athlete Profile
        </Badge>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {profile?.full_name || profile?.email || "Your profile"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              This is your personal gym identity: stats, XP, badges, and membership details in one place.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.24em] text-violet-100">Level {level}</div>
            <div className="mt-3 h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-violet-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-sm text-slate-300">{progress} / 100 XP to next level</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-700/70">
            Personal details
          </div>
          <form action={updateProfile} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                className="min-h-12 rounded-2xl"
              />
            </div>
            <div className="rounded-[24px] bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {profile?.email}
            </div>
            <Button type="submit" className="min-h-11 rounded-full px-5">
              Save profile
            </Button>
          </form>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-700/70">
            Snapshot
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Total XP
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{totalXp}</div>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Flame className="h-4 w-4 text-orange-500" />
                Current streak
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{stats?.current_streak ?? 0}</div>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Medal className="h-4 w-4 text-violet-500" />
                Membership
              </div>
              <div className="mt-3 text-sm font-medium text-slate-950 capitalize">
                {membership?.role ?? "member"} · {membership?.status ?? "active"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Joined{" "}
                {membership?.joined_at
                  ? new Date(membership.joined_at).toLocaleDateString()
                  : "-"}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-700/70">
                Badges
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Earned milestones</h2>
            </div>
            <Badge className="rounded-full" variant="outline">
              {badgeAwards?.length ?? 0} earned
            </Badge>
          </div>

          {badgeAwards?.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {badgeAwards.map((award) => {
                const badge = Array.isArray(award.badges) ? award.badges[0] : award.badges;

                return (
                  <div key={award.id} className="rounded-[24px] border border-slate-100 bg-slate-50/90 p-4">
                    <div className="text-lg font-semibold text-slate-950">
                      {badge?.icon ? `${badge.icon} ` : ""}
                      {badge?.name ?? "Badge"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-500">
                      {badge?.description || "Awarded by your gym."}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      Earned {new Date(award.awarded_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
              No badges yet. Challenges and consistency will unlock them.
            </div>
          )}
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-700/70">
                XP history
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Recent activity</h2>
            </div>
            <Badge className="rounded-full" variant="secondary">
              {totalXp} XP
            </Badge>
          </div>
          <div className="mt-5 space-y-3">
            {xpEvents?.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-[24px] bg-slate-50/90 p-4">
                <div>
                  <div className="font-medium text-slate-950">{event.reason}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge className="rounded-full" variant={event.points >= 0 ? "secondary" : "outline"}>
                  {event.points >= 0 ? "+" : ""}
                  {event.points} XP
                </Badge>
              </div>
            ))}
            {!xpEvents?.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
                XP entries will appear after your first gym action.
              </div>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
