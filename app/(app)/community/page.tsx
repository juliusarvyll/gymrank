import { requireActiveGym } from "@/lib/app/server";
import { postShoutout } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default async function CommunityPage() {
  const { supabase, gym } = await requireActiveGym();

  const { data: activity } = await supabase
    .from("activity_events")
    .select("id,event_type,data,created_at,actor_user_id,target_user_id")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const userIds = Array.from(
    new Set(
      activity
        ?.flatMap((item) => [item.actor_user_id, item.target_user_id])
        .filter(Boolean) as string[],
    ),
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
        <h1 className="text-2xl font-semibold">Community</h1>
        <p className="text-sm text-muted-foreground">
          Celebrate wins and highlight member milestones.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Post a shoutout</h2>
        <form action={postShoutout} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              name="message"
              placeholder="Shoutout to the 6am crew!"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_user_id">Member ID (optional)</Label>
            <Input
              id="target_user_id"
              name="target_user_id"
              placeholder="uuid"
            />
          </div>
          <Button type="submit">Post shoutout</Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Activity feed</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {activity?.map((item) => {
            const actor = item.actor_user_id
              ? profileMap.get(item.actor_user_id)
              : null;
            const target = item.target_user_id
              ? profileMap.get(item.target_user_id)
              : null;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-border/60 pb-2"
              >
                <div>
                  <div className="text-foreground">
                    {item.event_type.toUpperCase()} ·{" "}
                    {actor?.full_name || actor?.email || "System"}
                    {target ? ` → ${target.full_name || target.email}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(item.data as { message?: string })?.message}
                  </div>
                </div>
                <div className="text-xs">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
          {!activity?.length ? <div>No activity yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}
