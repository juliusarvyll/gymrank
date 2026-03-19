import { Suspense } from "react";
import { requireAdminWorkspace } from "@/lib/app/server";
import { getClassAttendanceLeaderboard } from "@/lib/app/queries";
import {
  cancelClassBooking,
  createClassSession,
  markAttendance,
  upsertClassBooking,
} from "@/app/app/classes/actions";
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
  const { supabase, gym } = await requireAdminWorkspace();

  const [{ data: branches }, { data: sessions }, { data: members }] = await Promise.all([
    supabase.from("gym_branches").select("id,name").eq("gym_id", gym.id),
    supabase
      .from("class_sessions")
      .select("id,name,starts_at,ends_at,branch_id,capacity,waitlist_capacity")
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
      ? supabase.from("profiles").select("id,full_name,email").in("id", memberIds)
      : Promise.resolve({ data: [] }),
    getClassAttendanceLeaderboard(gym.id),
  ]);

  const { data: profiles } = profilesResult;
  const profileMap = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);

  const sessionIds = sessions?.map((session) => session.id) ?? [];
  const [{ data: attendanceRows }, { data: bookingRows }] = await Promise.all([
    sessionIds.length
      ? supabase.from("class_attendance").select("session_id,user_id").in("session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? supabase
          .from("class_bookings")
          .select("id,session_id,user_id,status,created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const attendanceBySession = new Map<string, number>();
  for (const row of attendanceRows ?? []) {
    attendanceBySession.set(row.session_id, (attendanceBySession.get(row.session_id) ?? 0) + 1);
  }

  const bookingsBySession = new Map<
    string,
    Array<{
      id: string;
      session_id: string;
      user_id: string;
      status: string;
      created_at: string;
    }>
  >();

  for (const row of bookingRows ?? []) {
    const existing = bookingsBySession.get(row.session_id) ?? [];
    existing.push(row);
    bookingsBySession.set(row.session_id, existing);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Classes</h1>
        <p className="text-sm text-muted-foreground">
          Schedule classes, manage capacity, and work bookings or waitlists before check-in.
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
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" name="capacity" type="number" min="1" step="1" placeholder="20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist_capacity">Waitlist capacity</Label>
            <Input
              id="waitlist_capacity"
              name="waitlist_capacity"
              type="number"
              min="0"
              step="1"
              placeholder="5"
            />
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
              Book members in advance, manage a waitlist, and mark attendance after class.
            </p>
          </div>
          <Badge variant="outline">Operations</Badge>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          {sessions?.map((session) => {
            const bookings = bookingsBySession.get(session.id) ?? [];
            const booked = bookings.filter((booking) => booking.status === "booked");
            const waitlisted = bookings.filter((booking) => booking.status === "waitlisted");
            const cancelled = bookings.filter((booking) => booking.status === "cancelled");
            const remaining =
              typeof session.capacity === "number"
                ? Math.max(session.capacity - booked.length, 0)
                : null;

            return (
              <div key={session.id} className="space-y-4 rounded-md border border-border/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium text-foreground">{session.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.starts_at).toLocaleString()} -{" "}
                      {new Date(session.ends_at).toLocaleTimeString()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {attendanceBySession.get(session.id) ?? 0} attended
                      </Badge>
                      <Badge variant="outline">
                        {booked.length}
                        {typeof session.capacity === "number" ? `/${session.capacity}` : ""} booked
                      </Badge>
                      <Badge variant="outline">
                        {waitlisted.length}
                        {typeof session.waitlist_capacity === "number"
                          ? `/${session.waitlist_capacity}`
                          : ""}{" "}
                        waitlisted
                      </Badge>
                      {remaining !== null ? (
                        <Badge variant={remaining === 0 ? "secondary" : "outline"}>
                          {remaining} spots left
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="space-y-3 rounded-md border border-border/60 p-3">
                    <div className="font-medium text-foreground">Bookings</div>
                    <form action={upsertClassBooking} className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                      <input type="hidden" name="session_id" value={session.id} />
                      <select
                        name="user_id"
                        className="rounded-md border border-border bg-background px-2 py-2 text-xs"
                      >
                        {profiles?.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {formatName(profile)}
                          </option>
                        ))}
                      </select>
                      <select
                        name="status"
                        defaultValue="booked"
                        className="rounded-md border border-border bg-background px-2 py-2 text-xs"
                      >
                        <option value="booked">Booked</option>
                        <option value="waitlisted">Waitlist</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Button size="sm" type="submit">
                        Save booking
                      </Button>
                    </form>

                    <div className="space-y-2">
                      {bookings.map((booking) => {
                        const profile = profileMap.get(booking.user_id);
                        return (
                          <div
                            key={booking.id}
                            className="flex flex-col gap-2 rounded-md border border-border/50 p-2 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="text-sm text-foreground">{formatName(profile ?? { full_name: null, email: null })}</div>
                              <div className="text-xs text-muted-foreground">{profile?.email ?? booking.user_id}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={booking.status === "booked" ? "secondary" : "outline"}>
                                {booking.status}
                              </Badge>
                              {booking.status !== "cancelled" ? (
                                <form action={cancelClassBooking}>
                                  <input type="hidden" name="booking_id" value={booking.id} />
                                  <Button size="sm" type="submit" variant="outline">
                                    Cancel
                                  </Button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                      {!bookings.length ? (
                        <div className="text-xs text-muted-foreground">
                          No one is booked yet. Use the form above to fill the class or start a waitlist.
                        </div>
                      ) : null}
                    </div>

                    {!!cancelled.length ? (
                      <div className="text-xs text-muted-foreground">
                        {cancelled.length} cancelled booking{cancelled.length === 1 ? "" : "s"} retained in the log.
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-md border border-border/60 p-3">
                    <div className="font-medium text-foreground">Attendance</div>
                    <form action={markAttendance} className="flex flex-wrap gap-2">
                      <input type="hidden" name="session_id" value={session.id} />
                      <select
                        name="user_id"
                        className="rounded-md border border-border bg-background px-2 py-2 text-xs"
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
                    <div className="text-xs text-muted-foreground">
                      Attendance remains manual for now, but booking counts give staff a live roster before class starts.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!sessions?.length ? <div>No classes scheduled yet.</div> : null}
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
            <div className="text-sm text-muted-foreground">No class attendance data yet.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
