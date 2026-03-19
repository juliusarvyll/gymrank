import { Suspense } from "react";
import { Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireMemberGym } from "@/lib/app/server";
import { joinMemberChallenge } from "@/app/member/challenges/actions";

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

function getProgressPercent(challenge: ChallengeRow, participant?: ParticipantRow | null) {
  if (!participant || !challenge.target_value || challenge.target_value <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((participant.progress_value / challenge.target_value) * 100),
  );
}

export default function MemberChallengesPage() {
  return (
    <Suspense fallback={<div className="rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">Loading challenge board...</div>}>
      <MemberChallengesContent />
    </Suspense>
  );
}

async function MemberChallengesContent() {
  const { supabase, gym, user } = await requireMemberGym("/login?next=/challenges");

  const { data: challengeRows } = await supabase
    .from("challenges")
    .select("id,name,description,type,start_at,end_at,target_value,reward_points")
    .eq("gym_id", gym.id)
    .order("start_at", { ascending: false });

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

  const participantsByChallenge = new Map<string, ParticipantRow[]>();
  participants.forEach((participant) => {
    const current = participantsByChallenge.get(participant.challenge_id) ?? [];
    current.push(participant);
    participantsByChallenge.set(participant.challenge_id, current);
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#082f49_0%,#0f172a_48%,#0891b2_150%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.24)] sm:p-8">
        <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
          Challenge Hub
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Pick a target, chase the board, and close the gap.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          This is your competitive lane. Join challenges, track completion, and climb within your gym.
        </p>
      </section>

      <div className="space-y-4">
        {challenges.map((challenge) => {
          const board = [...(participantsByChallenge.get(challenge.id) ?? [])].sort(
            (a, b) =>
              b.progress_value - a.progress_value ||
              new Date(a.joined_at ?? 0).getTime() - new Date(b.joined_at ?? 0).getTime(),
          );
          const joined = board.some((row) => row.user_id === user.id);
          const myStanding = board.find((row) => row.user_id === user.id);
          const progressPercent = getProgressPercent(challenge, myStanding);
          const topProgress = board[0]?.progress_value ?? 0;
          const visibleBoard = board.slice(0, 5);

          return (
            <Card key={challenge.id} className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-950">{challenge.name}</h2>
                    <Badge className="rounded-full" variant="outline">
                      {challenge.type}
                    </Badge>
                    <Badge className="rounded-full" variant="secondary">
                      {challenge.reward_points ?? 0} XP
                    </Badge>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">{challenge.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Ends {new Date(challenge.end_at).toLocaleDateString()}</span>
                    <span>{board.length} participants</span>
                    <span>Leader progress {topProgress}</span>
                  </div>
                </div>

                {joined ? (
                  <div className="rounded-[24px] bg-slate-950 px-4 py-3 text-sm text-white">
                    <div className="text-slate-300">Your progress</div>
                    <div className="mt-1 text-xl font-semibold">
                      {myStanding?.progress_value ?? 0}
                      {challenge.target_value ? ` / ${challenge.target_value}` : ""}
                    </div>
                  </div>
                ) : (
                  <form action={joinMemberChallenge}>
                    <input type="hidden" name="challenge_id" value={challenge.id} />
                    <Button type="submit" className="min-h-11 rounded-full px-5">
                      Join challenge
                    </Button>
                  </form>
                )}
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-3 rounded-[28px] bg-slate-50/90 p-5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Target className="h-4 w-4 text-sky-500" />
                      Completion progress
                    </div>
                    <span className="font-medium text-slate-950">{progressPercent}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="text-sm text-slate-500">
                    {joined
                      ? myStanding?.completed_at
                        ? "Challenge completed."
                        : "Keep showing up. Every check-in keeps the board moving."
                      : "Join to start recording progress and appear on the standings."}
                  </div>
                </div>

                <div className="rounded-[28px] bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                    <Trophy className="h-4 w-4" />
                    Top standings
                  </div>
                  <div className="mt-4 space-y-3">
                    {visibleBoard.map((participant, index) => (
                      <div key={`${participant.challenge_id}-${participant.user_id}`} className="flex items-center justify-between gap-3 rounded-[20px] bg-white/6 px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">#{index + 1}</div>
                          <div className="text-xs text-slate-300">
                            {participant.user_id === user.id ? "You" : "Member"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {participant.progress_value}
                            {challenge.target_value ? ` / ${challenge.target_value}` : ""}
                          </div>
                          <div className="text-xs text-slate-300">
                            {participant.completed_at ? "Completed" : "Active"}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!visibleBoard.length ? (
                      <div className="rounded-[20px] bg-white/6 px-4 py-3 text-sm text-slate-300">
                        Nobody has joined this one yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {!challenges.length ? (
          <Card className="rounded-[32px] border-white/80 bg-white/92 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            No challenges published yet.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
