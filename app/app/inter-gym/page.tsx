import { requireActiveGym } from "@/lib/app/server";
import { getActiveNetworkForUser } from "@/lib/app/queries";
import { createNetworkChallenge, joinNetworkChallenge } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default async function InterGymPage() {
  const { supabase, user, gym } = await requireActiveGym();
  const network = await getActiveNetworkForUser(user.id);

  if (!network) {
    return (
      <div className="max-w-xl">
        <Card className="p-6 space-y-2">
          <h1 className="text-lg font-semibold">No active network</h1>
          <p className="text-sm text-muted-foreground">
            Join or create a network to run inter-gym challenges.
          </p>
        </Card>
      </div>
    );
  }

  const { data: challengeIds } = await supabase
    .from("network_challenges")
    .select("id")
    .eq("network_id", network.id);

  const [
    { data: challenges },
    { data: participants },
    { data: gyms },
    { data: membership },
  ] = await Promise.all([
    supabase
      .from("network_challenges")
      .select("id,name,description,type,start_at,end_at,target_value")
      .eq("network_id", network.id)
      .order("start_at", { ascending: false }),
    challengeIds?.length
      ? supabase
          .from("network_challenge_participants")
          .select("challenge_id,gym_id,progress_value,completed_at")
          .in("challenge_id", challengeIds.map((c) => c.id))
      : Promise.resolve({ data: [] }),
    supabase
      .from("network_gyms")
      .select("gym_id,gyms(id,name,slug)")
      .eq("network_id", network.id),
    supabase
      .from("network_memberships")
      .select("role")
      .eq("network_id", network.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const canManage = membership?.role === "owner" || membership?.role === "admin";
  const joinedChallengeIds = new Set(
    participants
      ?.filter((p) => p.gym_id === gym.id)
      .map((p) => p.challenge_id),
  );

  const gymsMap = new Map(
    gyms?.map((row) => {
      const g = Array.isArray(row.gyms) ? row.gyms[0] : row.gyms;
      return g ? [row.gym_id, g] : [row.gym_id, null];
    }) ?? [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inter-gym challenges</h1>
        <p className="text-sm text-muted-foreground">
          Network: {network.name}
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Create network challenge</h2>
        {canManage ? (
          <form action={createNetworkChallenge} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Network Sprint" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="checkins">Check-ins</option>
                <option value="class_attendance">Class attendance</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
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
            <div className="md:col-span-3">
              <Button type="submit">Create</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Network admin access required.
          </p>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Challenges</h2>
        <div className="space-y-3">
          {challenges?.map((challenge) => (
            <div
              key={challenge.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">{challenge.name}</div>
                <div className="text-xs text-muted-foreground">
                  {challenge.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(challenge.start_at).toLocaleDateString()} -{" "}
                  {new Date(challenge.end_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{challenge.type}</Badge>
                {joinedChallengeIds.has(challenge.id) ? (
                  <Badge>Joined</Badge>
                ) : (
                  <form action={joinNetworkChallenge}>
                    <input type="hidden" name="challenge_id" value={challenge.id} />
                    <Button size="sm" type="submit">
                      Join with {gym.name}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {!challenges?.length ? (
            <div className="text-sm text-muted-foreground">
              No challenges yet.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Leaderboard</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          {participants
            ?.sort((a, b) => b.progress_value - a.progress_value)
            .map((entry) => {
              const g = gymsMap.get(entry.gym_id);
              return (
                <div
                  key={`${entry.challenge_id}-${entry.gym_id}`}
                  className="flex justify-between border-b border-border/60 pb-2"
                >
                  <span>{g?.name || entry.gym_id}</span>
                  <span>{entry.progress_value} pts</span>
                </div>
              );
            })}
          {!participants?.length ? (
            <div className="text-sm text-muted-foreground">
              No leaderboard data yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
