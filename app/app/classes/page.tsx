import { requireActiveGym } from "@/lib/app/server";
import { createClassSession, markAttendance } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ClassesPage() {
  const { supabase, gym } = await requireActiveGym();

  const [{ data: branches }, { data: sessions }, { data: members }] =
    await Promise.all([
      supabase
        .from("gym_branches")
        .select("id,name")
        .eq("gym_id", gym.id),
      supabase
        .from("class_sessions")
        .select("id,name,starts_at,ends_at,branch_id")
        .eq("gym_id", gym.id)
        .order("starts_at", { ascending: false })
        .limit(20),
      supabase
        .from("gym_memberships")
        .select("user_id")
        .eq("gym_id", gym.id)
        .eq("status", "active"),
    ]);

  const memberIds = members?.map((m) => m.user_id) ?? [];
  const { data: profiles } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", memberIds)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Classes</h1>
        <p className="text-sm text-muted-foreground">
          Schedule classes and record attendance.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Create class session</h2>
        <form action={createClassSession} className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Class name</Label>
            <Input id="name" name="name" placeholder="HIIT Circuit" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch</Label>
            <select
              id="branch_id"
              name="branch_id"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Main</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="starts_at">Start</Label>
            <Input id="starts_at" name="starts_at" type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ends_at">End</Label>
            <Input id="ends_at" name="ends_at" type="datetime-local" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Create session</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Recent sessions</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          {sessions?.map((session) => (
            <div
              key={session.id}
              className="space-y-2 rounded-md border border-border/60 p-3"
            >
              <div className="text-foreground font-medium">{session.name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(session.starts_at).toLocaleString()} -{" "}
                {new Date(session.ends_at).toLocaleTimeString()}
              </div>
              <form action={markAttendance} className="flex flex-wrap gap-2">
                <input type="hidden" name="session_id" value={session.id} />
                <select
                  name="user_id"
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {profiles?.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </option>
                  ))}
                </select>
                <Button size="sm" type="submit">
                  Mark attendance
                </Button>
              </form>
            </div>
          ))}
          {!sessions?.length ? (
            <div>No classes scheduled yet.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
