import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Bell,
  Flame,
  Gift,
  QrCode,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/app/server";
import {
  getActiveGymForUser,
  getGymLeaderboardMembers,
  getUserMembershipRole,
} from "@/lib/app/queries";

type ActivityRow = {
  id: string;
  event_type: string;
  data: { message?: string; source?: string } | null;
  created_at: string;
  actor_user_id: string | null;
  target_user_id: string | null;
};

function getLevel(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

function getProgress(totalXp: number) {
  return totalXp % 100;
}

function getActivityCopy(item: ActivityRow, actorName: string, targetName: string | null) {
  if (item.event_type === "shoutout") {
    return {
      title: `${actorName} dropped a shoutout`,
      body: item.data?.message ?? "Community love is building momentum.",
    };
  }

  if (item.event_type === "checkin") {
    const subject = targetName ?? actorName;
    return {
      title: `${subject} checked in`,
      body:
        item.data?.source === "qr"
          ? "Verified from the QR lane."
          : "Logged a fresh gym visit.",
    };
  }

  return {
    title: `${actorName} posted an update`,
    body: item.data?.message ?? "Activity is moving inside your gym.",
  };
}

export default function MemberHomePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[32px] border border-emerald-100 bg-white p-6 text-sm text-emerald-700 shadow-sm">
          Loading your club...
        </div>
      }
    >
      <MemberHomeContent />
    </Suspense>
  );
}

async function MemberHomeContent() {
  const { supabase, user } = await requireUser("/login?next=/");
  const gym = await getActiveGymForUser(user.id);

  if (!gym) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200 bg-emerald-900 p-6 text-white shadow-sm sm:p-8">
          <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
            Member Club
          </Badge>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Your member space is ready. You still need a gym connection.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
            Ask your gym owner to add your email or scan their join QR so your check-ins,
            challenges, rewards, and community feed can come alive here.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="rounded-[32px] border-emerald-100 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
              Next Step
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Wait for gym activation or join from an invite link
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Once your gym links your account, this home feed will switch into the full
              member experience automatically.
            </p>
          </Card>

          <Card className="rounded-[32px] border-emerald-100 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
              Signed in as
            </div>
            <div className="mt-3 break-all text-lg font-semibold text-slate-950">{user.email}</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              If you already scanned a join code, your gym may still be reviewing your access.
            </p>
          </Card>
        </section>
      </div>
    );
  }

  const role = await getUserMembershipRole(user.id, gym.id);
  if (role?.role === "owner" || role?.role === "staff") {
    return null;
  }

  const [
    { data: profile },
    { data: stats },
    { data: notifications },
    { data: challengeEntries },
    { data: rewardRedemptions },
    { data: rewards },
    { data: activity },
    leaderboard,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
    supabase
      .from("member_stats")
      .select("total_xp,total_checkins,current_streak,last_checkin_at")
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
      .select("challenge_id,progress_value,completed_at,challenges(id,name,target_value,end_at,reward_points)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(3),
    supabase
      .from("reward_redemptions")
      .select("id,status,created_at,rewards(name)")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("rewards")
      .select("id,name,xp_cost,stock")
      .eq("gym_id", gym.id)
      .order("xp_cost", { ascending: true })
      .limit(2),
    supabase
      .from("activity_events")
      .select("id,event_type,data,created_at,actor_user_id,target_user_id")
      .eq("gym_id", gym.id)
      .order("created_at", { ascending: false })
      .limit(6),
    getGymLeaderboardMembers(gym.id),
  ]);

  const profileIds = Array.from(
    new Set(
      ((activity ?? []) as ActivityRow[]).flatMap((item) => [
        item.actor_user_id,
        item.target_user_id,
      ]),
    ),
  ).filter(Boolean) as string[];

  const { data: feedProfiles } = profileIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const profileMap = new Map((feedProfiles ?? []).map((item) => [item.id, item]));

  const totalXp = stats?.total_xp ?? 0;
  const level = getLevel(totalXp);
  const progress = getProgress(totalXp);
  const unreadCount = notifications?.length ?? 0;
  const leaderboardRank = Math.max(
    1,
    leaderboard.findIndex((entry) => entry.id === user.id) + 1 || leaderboard.length + 1,
  );
  const firstName =
    profile?.full_name?.split(" ").filter(Boolean)[0] ??
    profile?.email?.split("@")[0] ??
    "Athlete";

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-emerald-200 bg-emerald-900 p-6 text-white shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="space-y-5">
            <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
              {gym.name}
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {firstName}, your gym story is built one session at a time.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
                Keep your streak hot, join live challenges, and show up in the club feed like
                it matters.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                type="button"
                variant="outline"
                className="min-h-11 rounded-full border-white/25 bg-white/10 px-5 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/check-in/qr">Open QR pass</Link>
              </Button>
              <Button
                asChild
                type="button"
                className="min-h-11 rounded-full bg-white px-5 text-emerald-950 hover:bg-emerald-50"
              >
                <Link href="/challenges">Join a challenge</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-emerald-50/80">Level</div>
              <div className="mt-2 text-3xl font-semibold">{level}</div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 text-xs text-emerald-50/80">{progress} / 100 XP</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-emerald-50/80">Streak</div>
              <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
                <Flame className="h-6 w-6 text-emerald-300" />
                {stats?.current_streak ?? 0}
              </div>
              <div className="mt-2 text-xs text-emerald-50/80">days in motion</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-emerald-50/80">Rank</div>
              <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
                <Trophy className="h-6 w-6 text-emerald-300" />
                #{leaderboardRank}
              </div>
              <div className="mt-2 text-xs text-emerald-50/80">inside the gym board</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Total check-ins</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{stats?.total_checkins ?? 0}</div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.last_checkin_at
              ? `Last visit ${new Date(stats.last_checkin_at).toLocaleDateString()}`
              : "Start your first session today"}
          </div>
        </Card>
        <Card className="rounded-[28px] border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Unread notifications</span>
            <Bell className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{unreadCount}</div>
          <div className="mt-2 text-xs text-slate-500">Challenge wins and reward updates live here</div>
        </Card>
        <Card className="rounded-[28px] border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Active challenges</span>
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{challengeEntries?.length ?? 0}</div>
          <div className="mt-2 text-xs text-slate-500">Join more and stack XP faster</div>
        </Card>
        <Card className="rounded-[28px] border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Reward redemptions</span>
            <Gift className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{rewardRedemptions?.length ?? 0}</div>
          <div className="mt-2 text-xs text-slate-500">Cash your effort into real perks</div>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <Card className="rounded-[32px] border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
                  Live Feed
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">What your gym is doing today</h2>
              </div>
              <Button asChild variant="ghost" className="rounded-full text-slate-600 hover:text-slate-950">
                <Link href="/community">
                  Open feed
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {((activity ?? []) as ActivityRow[]).map((item) => {
                const actor = item.actor_user_id ? profileMap.get(item.actor_user_id) : null;
                const target = item.target_user_id ? profileMap.get(item.target_user_id) : null;
                const actorName = actor?.full_name || actor?.email || "A member";
                const targetName = target?.full_name || target?.email || null;
                const copy = getActivityCopy(item, actorName, targetName);

                return (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-950">{copy.title}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{copy.body}</p>
                  </div>
                );
              })}
              {!activity?.length ? (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-slate-500">
                  No activity yet. Your next check-in can start the feed.
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
                  Challenge Radar
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">Your active pursuits</h2>
              </div>
              <Button asChild variant="ghost" className="rounded-full text-slate-600 hover:text-slate-950">
                <Link href="/challenges">See all</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {challengeEntries?.map((entry) => {
                const challenge = Array.isArray(entry.challenges)
                  ? entry.challenges[0]
                  : entry.challenges;
                const target = challenge?.target_value ?? 0;
                const progressPercent = target > 0
                  ? Math.min(100, Math.round(((entry.progress_value ?? 0) / target) * 100))
                  : 0;

                return (
                  <div
                    key={entry.challenge_id}
                    className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-950">{challenge?.name ?? "Challenge"}</div>
                      <Badge className="rounded-full" variant={entry.completed_at ? "secondary" : "outline"}>
                        {entry.completed_at ? "Completed" : `${challenge?.reward_points ?? 0} XP`}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-emerald-100">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {entry.progress_value ?? 0}
                        {target ? ` / ${target}` : ""} progress
                      </span>
                      <span>
                        {challenge?.end_at
                          ? `Ends ${new Date(challenge.end_at).toLocaleDateString()}`
                          : "Live now"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {!challengeEntries?.length ? (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-slate-500">
                  No active challenges yet. Join one and your progress will show up here.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-[32px] border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
                  Quick Rewards
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">Low-friction wins</h2>
              </div>
              <Button asChild variant="ghost" className="rounded-full text-slate-600 hover:text-slate-950">
                <Link href="/rewards">Catalog</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {rewards?.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{reward.name}</div>
                    <Badge className="rounded-full" variant="secondary">
                      {reward.xp_cost} XP
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {reward.stock === null ? "Always available" : `${reward.stock} left`}
                  </div>
                </div>
              ))}
              {!rewards?.length ? (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-slate-500">
                  Your gym has not published rewards yet.
                </div>
              ) : null}
            </div>

            {rewardRedemptions?.length ? (
              <div className="mt-5 space-y-2 rounded-[24px] bg-emerald-900 p-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  Latest redemptions
                </div>
                {rewardRedemptions.map((redemption) => {
                  const reward = Array.isArray(redemption.rewards)
                    ? redemption.rewards[0]
                    : redemption.rewards;

                  return (
                    <div key={redemption.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>{reward?.name ?? "Reward"}</span>
                      <span className="text-emerald-50/80">{redemption.status}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>

          <Card className="rounded-[32px] border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
                  Fast Lane
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">Move in one tap</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button asChild className="min-h-12 rounded-2xl">
                <Link href="/check-in/qr">
                  <QrCode className="h-4 w-4" />
                  QR pass
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-12 rounded-2xl">
                <Link href="/notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
