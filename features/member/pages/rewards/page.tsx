import { Suspense } from "react";
import { Gift, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireMemberGym } from "@/lib/app/server";
import { redeemMemberReward } from "@/app/member/rewards/actions";

export default function MemberRewardsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[32px] border border-emerald-100 bg-white p-6 text-sm text-emerald-700 shadow-sm">
          Loading reward catalog...
        </div>
      }
    >
      <MemberRewardsContent />
    </Suspense>
  );
}

async function MemberRewardsContent() {
  const { supabase, gym, user } = await requireMemberGym("/login?next=/rewards");

  const [{ data: rewards }, { data: redemptions }, { data: stats }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id,name,description,xp_cost,stock")
      .eq("gym_id", gym.id)
      .order("xp_cost", { ascending: true }),
    supabase
      .from("reward_redemptions")
      .select("id,status,created_at,rewards(name)")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("member_stats")
      .select("total_xp")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const myXp = stats?.total_xp ?? 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] border border-emerald-200 bg-emerald-900 p-6 text-white shadow-sm sm:p-8">
        <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100">
          Reward Store
        </Badge>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn consistency into perks.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
              The more you show up, the more you can unlock. Redeem XP for rewards your gym has
              stocked.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/10 px-5 py-4">
            <div className="text-xs uppercase tracking-[0.24em] text-emerald-100">Available XP</div>
            <div className="mt-2 text-3xl font-semibold">{myXp}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {rewards?.map((reward) => {
            const canRedeem =
              myXp >= reward.xp_cost &&
              (reward.stock === null || reward.stock > 0);

            return (
              <Card key={reward.id} className="rounded-[32px] border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-950">{reward.name}</h2>
                      <Badge className="rounded-full" variant="secondary">
                        {reward.xp_cost} XP
                      </Badge>
                      {reward.stock !== null ? (
                        <Badge className="rounded-full" variant="outline">
                          {reward.stock} left
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {reward.description || "Redeemable through your gym front desk."}
                    </p>
                  </div>
                  <form action={redeemMemberReward}>
                    <input type="hidden" name="reward_id" value={reward.id} />
                    <Button
                      type="submit"
                      disabled={!canRedeem}
                      className="min-h-11 rounded-full px-5"
                    >
                      Redeem now
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
          {!rewards?.length ? (
            <Card className="rounded-[32px] border-emerald-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No rewards published yet.
            </Card>
          ) : null}
        </div>

        <Card className="rounded-[32px] border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/70">
            <Sparkles className="h-4 w-4" />
            Redemption History
          </div>
          <div className="mt-5 space-y-3">
            {redemptions?.map((redemption) => {
              const reward = Array.isArray(redemption.rewards)
                ? redemption.rewards[0]
                : redemption.rewards;

              return (
                <div key={redemption.id} className="rounded-[24px] bg-emerald-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{reward?.name ?? "Reward"}</div>
                    <Badge className="rounded-full" variant="outline">
                      {redemption.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(redemption.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
            {!redemptions?.length ? (
              <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-slate-500">
                Your reward history will show up after your first redemption.
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-[24px] bg-emerald-900 p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-emerald-200">
              <Gift className="h-4 w-4" />
              Spend with intent
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-50/85">
              XP is earned through check-ins, challenge completions, and ongoing consistency.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
