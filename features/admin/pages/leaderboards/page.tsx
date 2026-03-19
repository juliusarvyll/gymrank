import { Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdminWorkspace } from "@/lib/app/server";
import {
  getChallengeStandings,
  getClassAttendanceLeaderboard,
  getGymLeaderboardMembers,
} from "@/lib/app/queries";

function formatName(
  member: { full_name: string | null; email: string | null; id?: string },
) {
  return member.full_name || member.email || member.id || "Unknown member";
}

function sortMembers(
  members: Awaited<ReturnType<typeof getGymLeaderboardMembers>>,
  metric: "total_xp" | "current_streak" | "total_checkins",
) {
  return [...members].sort((a, b) => {
    const diff = b[metric] - a[metric];
    if (diff !== 0) return diff;
    if (b.longest_streak !== a.longest_streak) {
      return b.longest_streak - a.longest_streak;
    }
    return formatName(a).localeCompare(formatName(b));
  });
}

export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading leaderboards...</div>}>
      <LeaderboardsContent />
    </Suspense>
  );
}

async function LeaderboardsContent() {
  const { gym } = await requireAdminWorkspace();

  const [members, classAttendance, challenges] = await Promise.all([
    getGymLeaderboardMembers(gym.id),
    getClassAttendanceLeaderboard(gym.id),
    getChallengeStandings(gym.id),
  ]);

  const xpBoard = sortMembers(members, "total_xp");
  const streakBoard = sortMembers(members, "current_streak");
  const checkinBoard = sortMembers(members, "total_checkins");
  const topChallenge = challenges[0];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Leaderboards</h1>
        <p className="text-sm text-muted-foreground">
          Compare members by XP, streaks, check-ins, class attendance, and
          active challenge standings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">XP board</div>
              <div className="text-xs text-muted-foreground">
                Highest total XP in the gym
              </div>
            </div>
            <Badge variant="secondary">XP</Badge>
          </div>
          <div className="space-y-2">
            {xpBoard.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <span>
                  #{index + 1} {formatName(member)}
                </span>
                <span className="text-muted-foreground">
                  {member.total_xp} XP
                </span>
              </div>
            ))}
            {!xpBoard.length ? (
              <div className="text-sm text-muted-foreground">
                No XP data yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Streak board</div>
              <div className="text-xs text-muted-foreground">
                Consistency is the ranking signal
              </div>
            </div>
            <Badge variant="secondary">Streaks</Badge>
          </div>
          <div className="space-y-2">
            {streakBoard.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <span>
                  #{index + 1} {formatName(member)}
                </span>
                <span className="text-muted-foreground">
                  {member.current_streak} day streak
                </span>
              </div>
            ))}
            {!streakBoard.length ? (
              <div className="text-sm text-muted-foreground">
                No streak data yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Check-in board</div>
              <div className="text-xs text-muted-foreground">
                Most gym visits recorded
              </div>
            </div>
            <Badge variant="secondary">Visits</Badge>
          </div>
          <div className="space-y-2">
            {checkinBoard.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <span>
                  #{index + 1} {formatName(member)}
                </span>
                <span className="text-muted-foreground">
                  {member.total_checkins} check-ins
                </span>
              </div>
            ))}
            {!checkinBoard.length ? (
              <div className="text-sm text-muted-foreground">
                No check-in data yet.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                Class attendance leaderboard
              </h2>
              <p className="text-xs text-muted-foreground">
                Built from recorded class attendance.
              </p>
            </div>
            <Badge variant="outline">Classes</Badge>
          </div>
          <div className="space-y-2">
            {classAttendance.slice(0, 6).map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <span>
                  #{index + 1} {formatName(member)}
                </span>
                <span className="text-muted-foreground">
                  {member.attendance_count} classes
                </span>
              </div>
            ))}
            {!classAttendance.length ? (
              <div className="text-sm text-muted-foreground">
                No class attendance recorded yet.
              </div>
            ) : null}
          </div>
          <Link href="/admin/classes" className="text-sm text-primary underline">
            Review and mark class attendance
          </Link>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Challenge standings</h2>
              <p className="text-xs text-muted-foreground">
                Active challenge leaders and progress.
              </p>
            </div>
            <Badge variant="outline">Challenges</Badge>
          </div>
          <div className="space-y-3">
            {topChallenge ? (
              <div className="rounded-md border border-border/60 p-3">
                <div className="text-sm font-medium">{topChallenge.name}</div>
                <div className="text-xs text-muted-foreground">
                  {topChallenge.description}
                </div>
                <div className="mt-2 space-y-2">
                  {topChallenge.participants.slice(0, 4).map((participant, index) => (
                    <div
                      key={participant.user_id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        #{index + 1} {formatName(participant)}
                      </span>
                      <span className="text-muted-foreground">
                        {participant.progress_value} pts
                        {participant.completed_at ? " completed" : ""}
                      </span>
                    </div>
                  ))}
                  {!topChallenge.participants.length ? (
                    <div className="text-sm text-muted-foreground">
                      No participants yet.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No active challenges yet.
              </div>
            )}
          </div>
          <Link href="/admin/challenges" className="text-sm text-primary underline">
            View challenge management
          </Link>
        </Card>
      </div>
    </div>
  );
}
