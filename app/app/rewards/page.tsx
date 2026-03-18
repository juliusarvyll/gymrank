import { Suspense } from "react";
import { requireActiveGym } from "@/lib/app/server";
import {
  createReward,
  redeemReward,
  updateRedemptionStatus,
} from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function RewardsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading rewards...</div>}>
      <RewardsContent />
    </Suspense>
  );
}

async function RewardsContent() {
  const { supabase, gym, user } = await requireActiveGym();

  const [
    { data: rewards },
    { data: redemptions },
    { data: myRole },
    { data: myStats },
  ] = await Promise.all([
    supabase
      .from("rewards")
      .select("id,name,description,xp_cost,stock")
      .eq("gym_id", gym.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reward_redemptions")
      .select("id,reward_id,user_id,status,created_at")
      .eq("gym_id", gym.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("gym_memberships")
      .select("role")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("member_stats")
      .select("total_xp")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const canManage = myRole?.role === "owner" || myRole?.role === "staff";
  const myXp = myStats?.total_xp ?? 0;

  const userIds = Array.from(
    new Set(redemptions?.map((r) => r.user_id) ?? []),
  );
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
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-muted-foreground">
          Incentivize engagement with redeemable rewards.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Create reward</h2>
        {canManage ? (
          <form action={createReward} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Free shake" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xp_cost">XP cost</Label>
              <Input id="xp_cost" name="xp_cost" type="number" />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Protein bar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" name="stock" type="number" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Add reward</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Staff access required to create rewards.
          </p>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Reward catalog</h2>
          {!canManage ? (
            <Badge variant="secondary">{myXp} XP available</Badge>
          ) : null}
        </div>
        <div className="space-y-3">
          {rewards?.map((reward) => (
            <div
              key={reward.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">{reward.name}</div>
                <div className="text-xs text-muted-foreground">
                  {reward.description}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{reward.xp_cost} XP</Badge>
                {reward.stock !== null ? (
                  <Badge variant="outline">{reward.stock} left</Badge>
                ) : null}
                <form action={redeemReward}>
                  <input type="hidden" name="reward_id" value={reward.id} />
                  <Button
                    size="sm"
                    type="submit"
                    disabled={
                      myXp < reward.xp_cost ||
                      (reward.stock !== null && reward.stock <= 0)
                    }
                  >
                    Redeem
                  </Button>
                </form>
              </div>
            </div>
          ))}
          {!rewards?.length ? (
            <div className="text-sm text-muted-foreground">No rewards yet.</div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">
          {canManage ? "Recent redemptions" : "Your redemptions"}
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {(canManage
            ? redemptions
            : redemptions?.filter((redemption) => redemption.user_id === user.id)
          )?.map((redemption) => {
            const profile = profileMap.get(redemption.user_id);
            return (
              <div
                key={redemption.id}
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-foreground">
                    {canManage
                      ? profile?.full_name || profile?.email || redemption.user_id
                      : "Reward redemption"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {canManage
                      ? redemption.status
                      : `${redemption.status} • ${new Date(redemption.created_at).toLocaleDateString()}`}
                  </div>
                </div>
                {canManage ? (
                  <form action={updateRedemptionStatus}>
                    <input
                      type="hidden"
                      name="redemption_id"
                      value={redemption.id}
                    />
                    <select
                      name="status"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      defaultValue={redemption.status}
                    >
                      <option value="pending">Pending</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <Button size="sm" type="submit" className="ml-2">
                      Update
                    </Button>
                  </form>
                ) : (
                  <Badge variant="outline">{redemption.status}</Badge>
                )}
              </div>
            );
          })}
          {!(canManage
            ? redemptions?.length
            : redemptions?.some((redemption) => redemption.user_id === user.id)) ? (
            <div className="text-sm text-muted-foreground">
              No redemptions yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
