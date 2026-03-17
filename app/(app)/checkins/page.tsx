import { requireActiveGym } from "@/lib/app/server";
import { createCheckin } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default async function CheckinsPage() {
  const { supabase, gym } = await requireActiveGym();

  const { data: members } = await supabase
    .from("gym_memberships")
    .select("user_id")
    .eq("gym_id", gym.id)
    .eq("status", "active");

  const memberIds = members?.map((m) => m.user_id) ?? [];

  const [{ data: profiles }, { data: checkins }] = await Promise.all([
    memberIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", memberIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("checkins")
      .select("id,user_id,created_at,source,verified_by_user_id")
      .eq("gym_id", gym.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profileMap = new Map(
    profiles?.map((profile) => [profile.id, profile]) ?? [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check-ins</h1>
        <p className="text-sm text-muted-foreground">
          Record and verify member attendance.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Manual check-in</h2>
        <form action={createCheckin} className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="user_id">Member</Label>
            <select
              id="user_id"
              name="user_id"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {profiles?.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              name="source"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="manual">Manual</option>
              <option value="qr">QR</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Record check-in</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Recent check-ins</h2>
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
                    {member?.full_name || member?.email || checkin.user_id}
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
