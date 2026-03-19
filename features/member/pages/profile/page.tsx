import { Suspense } from "react";
import { Flame, Medal, ReceiptText, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireMemberGym } from "@/lib/app/server";
import { updateMemberProfile } from "@/app/member/profile/actions";
import { LogoutButton } from "@/components/logout-button";

function getLevel(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

function getLevelProgress(totalXp: number) {
  return totalXp % 100;
}

function formatCurrency(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export default function MemberProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[32px] border border-emerald-100 bg-white p-6 text-sm text-emerald-700 shadow-sm">
          Loading profile...
        </div>
      }
    >
      <MemberProfileContent />
    </Suspense>
  );
}

async function MemberProfileContent() {
  const { supabase, user, gym } = await requireMemberGym("/login?next=/profile");

  const [
    { data: profile },
    { data: stats },
    { data: membership },
    { data: badgeAwards },
    { data: xpEvents },
    { data: invoices },
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
      .select("role,status,joined_at,plan_id,membership_plans(name,billing_interval,price_cents)")
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
      .from("member_invoices")
      .select("id,invoice_number,amount_cents,currency,due_date,status")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const totalXp = stats?.total_xp ?? 0;
  const level = getLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const linkedPlan = Array.isArray(membership?.membership_plans)
    ? membership.membership_plans[0]
    : membership?.membership_plans;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,#052e16_0%,#065f46_58%,#10b981_100%)] p-6 text-white shadow-[0_24px_60px_rgba(6,78,59,0.18)] sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div>
            <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
              Athlete Profile
            </Badge>
            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Your gym identity, streak, plan, and billing trail all in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
              This is your personal hub for profile details, rewards progress, recent invoices, and the account actions you actually need.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-50">
                {profile?.full_name || profile?.email || "Member"}
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-50">
                {gym.name}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/85">
              Account actions
            </div>
            <div className="mt-3 space-y-2 text-sm text-emerald-50/82">
              <div>{profile?.email}</div>
              <div>
                {linkedPlan
                  ? `${linkedPlan.name} · ${formatCurrency(linkedPlan.price_cents)} / ${linkedPlan.billing_interval}`
                  : "No plan assigned yet"}
              </div>
              <div>
                Joined{" "}
                {membership?.joined_at
                  ? new Date(membership.joined_at).toLocaleDateString()
                  : "-"}
              </div>
            </div>
            <LogoutButton
              className="mt-5 w-full rounded-full bg-white text-emerald-950 hover:bg-emerald-50"
              label="Log out of member app"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Level",
            value: `${level}`,
            detail: `${progress} / 100 XP`,
            icon: Sparkles,
          },
          {
            label: "Current streak",
            value: `${stats?.current_streak ?? 0}`,
            detail: `${stats?.longest_streak ?? 0} best streak`,
            icon: Flame,
          },
          {
            label: "Total check-ins",
            value: `${stats?.total_checkins ?? 0}`,
            detail: "Visits recorded",
            icon: Trophy,
          },
          {
            label: "Recent invoices",
            value: `${invoices?.length ?? 0}`,
            detail: "Cash dues history",
            icon: ReceiptText,
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

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
              Identity
            </div>
            <h2 className="mt-2 text-xl font-semibold text-emerald-950">Personal details</h2>
          </div>
          <form action={updateMemberProfile} className="mt-5 space-y-4">
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
            <Button type="submit" className="rounded-full px-5">
              Save profile
            </Button>
          </form>
        </Card>

        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Membership
              </div>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">Plan and access</h2>
            </div>
            <Badge className="rounded-full bg-emerald-600 text-white">
              Level {level}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-emerald-900/72">
                <span>Level progress</span>
                <span>{progress} / 100 XP</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-emerald-100">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#059669,#34d399)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-emerald-50/70 p-4">
                <div className="text-sm text-emerald-900/65">Membership status</div>
                <div className="mt-2 text-lg font-semibold capitalize text-emerald-950">
                  {membership?.status ?? "active"}
                </div>
              </div>
              <div className="rounded-[1.2rem] bg-emerald-50/70 p-4">
                <div className="text-sm text-emerald-900/65">Role</div>
                <div className="mt-2 text-lg font-semibold capitalize text-emerald-950">
                  {membership?.role ?? "member"}
                </div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-emerald-100 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-emerald-900/72">
                <Medal className="h-4 w-4 text-emerald-700" />
                Assigned plan
              </div>
              <div className="mt-3 text-sm font-medium text-emerald-950">
                {linkedPlan
                  ? `${linkedPlan.name} · ${formatCurrency(linkedPlan.price_cents)} / ${linkedPlan.billing_interval}`
                  : "Not assigned yet"}
              </div>
              <div className="mt-1 text-xs text-emerald-900/55">
                Joined {membership?.joined_at ? new Date(membership.joined_at).toLocaleDateString() : "-"}
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
              No badges yet. Challenges and consistency will unlock them.
            </div>
          )}
        </Card>

        <Card className="rounded-[1.8rem] border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Recent XP activity
              </div>
              <h2 className="mt-2 text-xl font-semibold text-emerald-950">Momentum log</h2>
            </div>
            <Badge className="rounded-full bg-emerald-50 text-emerald-900">
              {totalXp} total XP
            </Badge>
          </div>
          <div className="mt-5 space-y-3" style={{ contentVisibility: "auto" }}>
            {xpEvents?.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-emerald-100 bg-emerald-50/70 p-4"
              >
                <div>
                  <div className="font-medium text-emerald-950">{event.reason}</div>
                  <div className="mt-1 text-xs text-emerald-900/55">
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
              <div className="rounded-[1.3rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-900/65">
                XP entries will appear after your first gym action.
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="rounded-[1.8rem] border-emerald-100 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
              Billing
            </div>
            <h2 className="mt-2 text-xl font-semibold text-emerald-950">Recent invoices</h2>
          </div>
          <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-800">
            {invoices?.length ?? 0} recent
          </Badge>
        </div>
        <div className="mt-5 space-y-3">
          {invoices?.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col gap-2 rounded-[1.3rem] border border-emerald-100 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-emerald-950">{invoice.invoice_number}</div>
                <div className="mt-1 text-xs text-emerald-900/55">
                  Due {new Date(invoice.due_date).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-emerald-950">
                  {formatCurrency(invoice.amount_cents, invoice.currency)}
                </div>
                <Badge className="rounded-full capitalize" variant={invoice.status === "paid" ? "secondary" : "outline"}>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          ))}
          {!invoices?.length ? (
            <div className="rounded-[1.3rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-900/65">
              No invoices yet. Your gym will post cash dues here when they are issued.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
