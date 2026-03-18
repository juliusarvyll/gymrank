import { requireActiveGym } from "@/lib/app/server";
import { updateProfile } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  const { supabase, user, gym } = await requireActiveGym();

  const [{ data: profile }, { data: stats }, { data: membership }] =
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
    ]);

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
          <div className="text-xs uppercase text-muted-foreground">Stats</div>
          <div className="mt-2 text-sm text-muted-foreground">
            XP: {stats?.total_xp ?? 0}
            <br />
            Check-ins: {stats?.total_checkins ?? 0}
            <br />
            Current streak: {stats?.current_streak ?? 0}
            <br />
            Longest streak: {stats?.longest_streak ?? 0}
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
    </div>
  );
}
