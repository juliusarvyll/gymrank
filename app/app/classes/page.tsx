import { Suspense } from "react";
import { requireActiveGym } from "@/lib/app/server";
import { getClassAttendanceLeaderboard } from "@/lib/app/queries";
import { createClassSession, markAttendance } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function formatName(member: { full_name: string | null; email: string | null }) {
  return member.full_name || member.email || "Unknown member";
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading classes...</div>}>
      <ClassesContent />
    </Suspense>
  );
}

async function ClassesContent() {
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
  const [profilesResult, attendanceLeaderboard] = await Promise.all([
    memberIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", memberIds)
      : Promise.resolve({ data: [] }),
    getClassAttendanceLeaderboard(gym.id),
  ]);

  const { data: profiles } = profilesResult;

  const sessionIds = sessions?.map((session) => session.id) ?? [];
  const { data: attendanceRows } = sessionIds.length
    ? await supabase
        .from("class_attendance")
        .select("session_id,user_id")
        .in("session_id", sessionIds)
    : { data: [] };

  const attendanceBySession = new Map<string, number>();
  for (const row of attendanceRows ?? []) {
    attendanceBySession.set(
      row.session_id,
      (attendanceBySession.get(row.session_id) ?? 0) + 1,
    );
  }

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent sessions</h2>
            <p className="text-xs text-muted-foreground">
              Attendance is tracked automatically when members are marked in.
            </p>
          </div>
          <Badge variant="outline">Attendance</Badge>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          {sessions?.map((session) => (
            <div
              key={session.id}
              className="space-y-2 rounded-md border border-border/60 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-foreground font-medium">{session.name}</div>
                <Badge variant="secondary">
                  {attendanceBySession.get(session.id) ?? 0} attended
                </Badge>
              </div>
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
                      {formatName(profile)}
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

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Class attendance leaderboard</h2>
            <p className="text-xs text-muted-foreground">
              Built from recorded attendance across all sessions.
            </p>
          </div>
          <Badge variant="secondary">Top attendees</Badge>
        </div>
        <div className="space-y-3">
          {attendanceLeaderboard.slice(0, 6).map((member, index) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm"
            >
              <div>
                <div className="font-medium">
                  #{index + 1} {formatName(member)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last attended{" "}
                  {member.last_attended_at
                    ? new Date(member.last_attended_at).toLocaleDateString()
                    : "unknown"}
                </div>
              </div>
              <Badge variant="outline">{member.attendance_count} classes</Badge>
            </div>
          ))}
          {!attendanceLeaderboard.length ? (
            <div className="text-sm text-muted-foreground">
              No class attendance data yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
