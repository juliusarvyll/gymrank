import { requireActiveGym } from "@/lib/app/server";
import { completeChallenge, createChallenge, joinChallenge } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ChallengeRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  start_at: string;
  end_at: string;
  target_value: number | null;
  reward_points: number | null;
};

type ParticipantRow = {
  challenge_id: string;
  user_id: string;
  progress_value: number;
  completed_at: string | null;
  joined_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function getDisplayName(profile?: ProfileRow | null) {
  return profile?.full_name || profile?.email || "Unknown member";
}

function getProgressLabel(challenge: ChallengeRow, participant: ParticipantRow) {
  if (challenge.target_value && challenge.target_value > 0) {
    return `${Math.min(participant.progress_value, challenge.target_value)} / ${challenge.target_value}`;
  }

  return `${participant.progress_value}`;
}

function getProgressPercent(challenge: ChallengeRow, participant: ParticipantRow) {
  if (!challenge.target_value || challenge.target_value <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((participant.progress_value / challenge.target_value) * 100),
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default async function ChallengesPage() {
  const { supabase, gym, user } = await requireActiveGym();

  const [{ data: challengeRows }, { data: myRole }] = await Promise.all([
    supabase
      .from("challenges")
      .select("id,name,description,type,start_at,end_at,target_value,reward_points")
      .eq("gym_id", gym.id)
      .order("start_at", { ascending: false }),
    supabase
      .from("gym_memberships")
      .select("role")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const challenges = (challengeRows ?? []) as ChallengeRow[];
  const challengeIds = challenges.map((challenge) => challenge.id);

  const { data: participantRows } = challengeIds.length
    ? await supabase
        .from("challenge_participants")
        .select("challenge_id,user_id,progress_value,completed_at,joined_at")
        .in("challenge_id", challengeIds)
        .order("progress_value", { ascending: false })
    : { data: [] };

  const participants = (participantRows ?? []) as ParticipantRow[];
  const participantUserIds = Array.from(
    new Set(participants.map((participant) => participant.user_id)),
  );

  const { data: profileRows } = participantUserIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", participantUserIds)
    : { data: [] };

  const profiles = (profileRows ?? []) as ProfileRow[];
  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile] as const),
  );

  const participantsByChallenge = new Map<string, ParticipantRow[]>();
  participants.forEach((participant) => {
    const current = participantsByChallenge.get(participant.challenge_id) ?? [];
    current.push(participant);
    participantsByChallenge.set(participant.challenge_id, current);
  });

  const canManage = myRole?.role === "owner" || myRole?.role === "staff";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Challenges</h1>
        <p className="text-sm text-muted-foreground">
          Drive competition with weekly and monthly goals.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Create challenge</h2>
        {canManage ? (
          <form action={createChallenge} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="7-Day Streak Sprint" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="checkins">Check-ins</option>
                <option value="streak">Streak</option>
                <option value="class_attendance">Class attendance</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Check in 5 times this week."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_at">Start</Label>
              <Input id="start_at" name="start_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">End</Label>
              <Input id="end_at" name="end_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_value">Target</Label>
              <Input id="target_value" name="target_value" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_points">Reward XP</Label>
              <Input id="reward_points" name="reward_points" type="number" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Create</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Staff access required to create challenges.
          </p>
        )}
      </Card>

      <div className="space-y-4">
        {challenges.map((challenge) => {
          const board = [...(participantsByChallenge.get(challenge.id) ?? [])].sort(
            (a, b) =>
              b.progress_value - a.progress_value ||
              Number(Boolean(b.completed_at)) - Number(Boolean(a.completed_at)) ||
              new Date(a.joined_at ?? 0).getTime() - new Date(b.joined_at ?? 0).getTime(),
          );
          const completedCount = board.filter((row) => row.completed_at).length;
          const completionPercent = board.length
            ? Math.round((completedCount / board.length) * 100)
            : 0;
          const leader = board[0];
          const visibleBoard = canManage ? board : board.slice(0, 5);
          const joinedIds = new Set(board.map((row) => row.user_id));
          const myStanding = board.find((row) => row.user_id === user.id);

          return (
            <Card key={challenge.id} className="p-6 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{challenge.name}</h2>
                    <Badge variant="outline">{challenge.type}</Badge>
                    <Badge variant="secondary">
                      {challenge.reward_points ?? 0} XP
                    </Badge>
                    {completedCount > 0 ? (
                      <Badge>Completed by {completedCount}</Badge>
                    ) : (
                      <Badge variant="outline">In progress</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {challenge.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(challenge.start_at)} - {formatDate(challenge.end_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {canManage && board.length ? (
                    <form action={completeChallenge} className="flex items-center gap-2">
                      <input type="hidden" name="challenge_id" value={challenge.id} />
                      <select
                        name="user_id"
                        className="rounded-md border border-border bg-background px-2 py-2 text-xs"
                        defaultValue={myStanding?.user_id ?? board[0]?.user_id}
                      >
                        {board.map((participant) => {
                          const profile = profileMap.get(participant.user_id);
                          return (
                            <option key={participant.user_id} value={participant.user_id}>
                              {getDisplayName(profile)}
                            </option>
                          );
                        })}
                      </select>
                      <Button size="sm" type="submit">
                        Complete and reward
                      </Button>
                    </form>
                  ) : null}
                  {joinedIds.has(user.id) ? (
                    <Badge>Joined</Badge>
                  ) : (
                    <form action={joinChallenge}>
                      <input type="hidden" name="challenge_id" value={challenge.id} />
                      <Button size="sm" type="submit">
                        Join
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Completion rate</span>
                  <span>{completionPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-foreground/70"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{board.length} participants</Badge>
                  <Badge variant="outline">{completedCount} completed</Badge>
                  <Badge variant="outline">
                    Best progress: {leader ? getProgressLabel(challenge, leader) : "0"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Participant board</h3>
                  {canManage ? (
                    <Badge variant="secondary">Staff view</Badge>
                  ) : (
                    <Badge variant="outline">Top standings</Badge>
                  )}
                </div>

                {visibleBoard.length ? (
                  <div className="space-y-2">
                    {visibleBoard.map((participant, index) => {
                      const profile = profileMap.get(participant.user_id);
                      const progressPercent = getProgressPercent(challenge, participant);
                      const isCurrentUser = participant.user_id === user.id;
                      const isCompleted = Boolean(participant.completed_at);

                      return (
                        <div
                          key={participant.user_id}
                          className={`flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between ${
                            isCurrentUser ? "bg-muted/40" : ""
                          }`}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">
                                #{index + 1} {getDisplayName(profile)}
                              </div>
                              {isCurrentUser ? <Badge>Me</Badge> : null}
                              {isCompleted ? <Badge>Completed</Badge> : null}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Joined {formatDate(participant.joined_at)}
                              {participant.completed_at
                                ? ` - Completed ${formatDate(participant.completed_at)}`
                                : ""}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="secondary">
                              {getProgressLabel(challenge, participant)}
                            </Badge>
                            <Badge variant="outline">{progressPercent}%</Badge>
                          </div>
                        </div>
                      );
                    })}
                    {!canManage && board.length > visibleBoard.length ? (
                      <div className="text-xs text-muted-foreground">
                        Showing the top {visibleBoard.length} participants. Staff can open the full board.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No participants yet.
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {!challenges.length ? (
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">No challenges yet.</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
