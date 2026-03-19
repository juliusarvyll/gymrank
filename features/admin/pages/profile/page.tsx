import { Suspense } from "react";
import { Bell, Flame, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { requireAdminWorkspace } from "@/lib/app/server";
import { updateProfile } from "@/app/app/profile/actions";
import { LogoutButton } from "@/components/logout-button";
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

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const { supabase, user, gym } = await requireAdminWorkspace();

  const [
    { data: profile },
    { data: stats },
    { data: membership },
    { data: badgeAwards },
    { data: xpEvents },
    { count: unreadNotifications },
    { count: activePlans },
    { data: recentInvoices },
  ] = await Promise.all([
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
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("membership_plans")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gym.id)
      .eq("active", true),
    supabase
      .from("member_invoices")
      .select("id,amount_cents,status")
      .eq("gym_id", gym.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const totalXp = stats?.total_xp ?? 0;
  const level = getLevel(totalXp);
  const levelProgress = getLevelProgress(totalXp);
  const xpToNextLevel = 100 - levelProgress;
  const outstandingAmount = (recentInvoices ?? [])
    .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.amount_cents, 0);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,#022c22_0%,#065f46_58%,#34d399_100%)] p-6 text-white shadow-[0_24px_60px_rgba(6,78,59,0.2)] sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_32%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div>
            <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
              Admin Profile
            </Badge>
            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Run the gym from a profile that actually feels like a control tower.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
              Your operator identity, access level, billing visibility, and personal activity are all in one place.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-50">
                {profile?.full_name || profile?.email || "Admin"}
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm capitalize text-emerald-50">
                {membership?.role ?? "staff"} · {membership?.status ?? "active"}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/85">
              Session control
            </div>
            <div className="mt-3 space-y-2 text-sm text-emerald-50/82">
              <div>{profile?.email}</div>
              <div>{gym.name}</div>
              <div>
                Joined{" "}
                {membership?.joined_at
                  ? new Date(membership.joined_at).toLocaleDateString()
                  : "-"}
              </div>
            </div>
            <LogoutButton
              className="mt-5 w-full rounded-full bg-white text-emerald-950 hover:bg-emerald-50"
              label="Log out of admin"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Operator level",
            value: `Level ${level}`,
            detail: `${levelProgress} / 100 XP`,
            icon: Sparkles,
          },
          {
            label: "Current streak",
            value: `${stats?.current_streak ?? 0}`,
            detail: `${stats?.longest_streak ?? 0} best streak`,
            icon: Flame,
          },
          {
            label: "Unread notices",
            value: `${unreadNotifications ?? 0}`,
            detail: "Notifications waiting",
            icon: Bell,
          },
          {
            label: "Active plans",
            value: `${activePlans ?? 0}`,
            detail: `${formatCurrency(outstandingAmount)} outstanding`,
            icon: WalletCards,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="rounded-[1.6rem] border-emerald-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-800">
                    {metric.label}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-emerald-950">{metric.value}</div>
                  <div className="mt-1 text-sm text-emerald-900/65">{metric.detail}</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Identity
              </div>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">Profile details</h2>
            </div>
            <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-800">
              {membership?.role ?? "staff"}
            </Badge>
          </div>

          <form action={updateProfile} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                className="min-h-12 rounded-2xl border-emerald-100 bg-emerald-50/60"
              />
            </div>
            <div className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900/72">
              {profile?.email}
            </div>
            <div className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900/72">
              {gym.name}
            </div>
            <Button type="submit" className="rounded-full px-5">
              Save changes
            </Button>
          </form>
        </Card>

        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Performance
              </div>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">Admin stats</h2>
            </div>
            <Badge className="rounded-full bg-emerald-600 text-white">
              Level {level}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-emerald-900/72">
                <span>Level progress</span>
                <span>{levelProgress} / 100 XP</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-emerald-100">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#059669,#34d399)]"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-emerald-900/65">
                {xpToNextLevel === 100 ? 0 : xpToNextLevel} XP to next level
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-emerald-50/70 p-4">
                <div className="text-sm text-emerald-900/65">Total XP</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-950">{totalXp}</div>
              </div>
              <div className="rounded-[1.2rem] bg-emerald-50/70 p-4">
                <div className="text-sm text-emerald-900/65">Check-ins verified</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-950">
                  {stats?.total_checkins ?? 0}
                </div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-emerald-100 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-emerald-900/72">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Access summary
              </div>
              <div className="mt-3 text-sm text-emerald-950 capitalize">
                {membership?.role ?? "staff"} · {membership?.status ?? "active"}
              </div>
              <div className="mt-1 text-xs text-emerald-900/65">
                Longest streak {stats?.longest_streak ?? 0} days
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Badges
              </div>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">Earned milestones</h2>
            </div>
            <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-800">
              {badgeAwards?.length ?? 0} earned
            </Badge>
          </div>

          {badgeAwards?.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {badgeAwards.map((award) => {
                const badge = Array.isArray(award.badges) ? award.badges[0] : award.badges;

                return (
                  <div
                    key={award.id}
                    className="rounded-[1.3rem] border border-emerald-100 bg-emerald-50/70 p-4"
                  >
                    <div className="font-semibold text-emerald-950">
                      {badge?.icon ? `${badge.icon} ` : ""}
                      {badge?.name ?? "Badge"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-emerald-900/65">
                      {badge?.description || "Awarded by your gym."}
                    </div>
                    <div className="mt-3 text-xs text-emerald-900/55">
                      Earned {new Date(award.awarded_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.3rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-900/65">
              No badges yet. Challenge wins and staff consistency will show up here.
            </div>
          )}
        </Card>

        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Recent XP activity
              </div>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">Operator timeline</h2>
            </div>
            <Badge className="rounded-full bg-emerald-50 text-emerald-900">
              {totalXp} total XP
            </Badge>
          </div>
          {xpEvents?.length ? (
            <div className="mt-5 space-y-3" style={{ contentVisibility: "auto" }}>
              {xpEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-emerald-100 bg-emerald-50/70 p-4 text-sm"
                >
                  <div>
                    <div className="font-medium text-emerald-950">{event.reason}</div>
                    <div className="mt-1 text-xs text-emerald-900/55">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={event.points >= 0 ? "secondary" : "outline"} className="rounded-full">
                    {event.points >= 0 ? "+" : ""}
                    {event.points} XP
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.3rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-900/65">
              XP activity will appear here after your first check-in or admin action.
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
