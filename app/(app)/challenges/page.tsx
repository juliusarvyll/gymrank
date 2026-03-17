import { requireActiveGym } from "@/lib/app/server";
import { createChallenge, joinChallenge } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function ChallengesPage() {
  const { supabase, gym, user } = await requireActiveGym();

  const [{ data: challenges }, { data: myRole }, { data: myParticipation }] =
    await Promise.all([
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
      supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id),
    ]);

  const joinedIds = new Set(myParticipation?.map((p) => p.challenge_id));
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

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Active challenges</h2>
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
                <Badge variant="secondary">
                  {challenge.reward_points ?? 0} XP
                </Badge>
                {joinedIds.has(challenge.id) ? (
                  <Badge>Joined</Badge>
                ) : (
                  <form action={joinChallenge}>
                    <input
                      type="hidden"
                      name="challenge_id"
                      value={challenge.id}
                    />
                    <Button size="sm" type="submit">
                      Join
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
    </div>
  );
}
