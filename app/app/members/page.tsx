import { requireActiveGym } from "@/lib/app/server";
import { addMember, updateMemberStatus } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function MembersPage() {
  const { supabase, gym, user } = await requireActiveGym();

  const { data: memberships } = await supabase
    .from("gym_memberships")
    .select("user_id,role,status,joined_at")
    .eq("gym_id", gym.id)
    .order("joined_at", { ascending: false });

  const userIds = memberships?.map((m) => m.user_id) ?? [];

  const [{ data: profiles }, { data: stats }, { data: myRole }] =
    await Promise.all([
      userIds.length
        ? supabase
            .from("profiles")
            .select("id,full_name,email,avatar_url")
            .in("id", userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase
            .from("member_stats")
            .select("user_id,total_xp,total_checkins,current_streak")
            .eq("gym_id", gym.id)
            .in("user_id", userIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("gym_memberships")
        .select("role")
        .eq("gym_id", gym.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const profileMap = new Map(
    profiles?.map((profile) => [profile.id, profile]) ?? [],
  );
  const statsMap = new Map(
    stats?.map((stat) => [stat.user_id, stat]) ?? [],
  );

  const canManage = myRole?.role === "owner" || myRole?.role === "staff";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Manage gym members, staff, and activity stats.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Add member</h2>
        {canManage ? (
          <form action={addMember} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Member email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="member@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="member">Member</option>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Add member</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need staff access to add members.
          </p>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Member list</h2>
        <div className="space-y-3">
          {memberships?.map((member) => {
            const profile = profileMap.get(member.user_id);
            const stat = statsMap.get(member.user_id);
            return (
              <div
                key={member.user_id}
                className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium">
                    {profile?.full_name || profile?.email || member.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profile?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    XP {stat?.total_xp ?? 0} · Check-ins{" "}
                    {stat?.total_checkins ?? 0} · Streak{" "}
                    {stat?.current_streak ?? 0}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{member.role}</Badge>
                  <Badge variant="outline">{member.status}</Badge>
                  {canManage ? (
                    <form action={updateMemberStatus}>
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <select
                        name="status"
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        defaultValue={member.status}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      <Button type="submit" size="sm" className="ml-2">
                        Update
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!memberships?.length ? (
            <div className="text-sm text-muted-foreground">
              No members yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
