import { Suspense } from "react";
import { requireActiveGym } from "@/lib/app/server";
import {
  addActivityComment,
  postShoutout,
  toggleActivityReaction,
} from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ReactionRow = {
  id: string;
  activity_event_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
};

type CommentRow = {
  id: string;
  activity_event_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  event_type: string;
  data: unknown;
  created_at: string;
  actor_user_id: string | null;
  target_user_id: string | null;
};

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading community...</div>}>
      <CommunityContent />
    </Suspense>
  );
}

async function CommunityContent() {
  const { supabase, gym } = await requireActiveGym();

  const { data: activity } = await supabase
    .from("activity_events")
    .select("id,event_type,data,created_at,actor_user_id,target_user_id")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const activityRows = (activity ?? []) as ActivityRow[];
  const activityIds = activityRows.map((item) => item.id);

  const [{ data: reactions }, { data: comments }] = await Promise.all([
    activityIds.length
      ? supabase
          .from("activity_reactions")
          .select("id,activity_event_id,user_id,reaction_type,created_at")
          .in("activity_event_id", activityIds)
      : Promise.resolve({ data: [] as ReactionRow[] }),
    activityIds.length
      ? supabase
          .from("activity_comments")
          .select("id,activity_event_id,user_id,body,created_at")
          .in("activity_event_id", activityIds)
      : Promise.resolve({ data: [] as CommentRow[] }),
  ]);

  const profileIds = Array.from(
    new Set([
      ...activityRows.flatMap((item) => [item.actor_user_id, item.target_user_id]),
      ...(comments ?? []).map((comment) => comment.user_id),
    ].filter(Boolean) as string[]),
  );

  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", profileIds)
    : { data: [] as ProfileRow[] };

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  const reactionMap = new Map<string, ReactionRow[]>();
  for (const reaction of (reactions ?? []) as ReactionRow[]) {
    const current = reactionMap.get(reaction.activity_event_id) ?? [];
    current.push(reaction);
    reactionMap.set(reaction.activity_event_id, current);
  }

  const commentMap = new Map<string, CommentRow[]>();
  for (const comment of (comments ?? []) as CommentRow[]) {
    const current = commentMap.get(comment.activity_event_id) ?? [];
    current.push(comment);
    commentMap.set(comment.activity_event_id, current);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Community</h1>
        <p className="text-sm text-muted-foreground">
          Celebrate wins and highlight member milestones.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Post a shoutout</h2>
        <form action={postShoutout} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              name="message"
              placeholder="Shoutout to the 6am crew!"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_user_id">Member ID (optional)</Label>
            <Input
              id="target_user_id"
              name="target_user_id"
              placeholder="uuid"
            />
          </div>
          <Button type="submit">Post shoutout</Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold">Activity feed</h2>
        <div className="space-y-4">
          {activityRows.map((item) => {
            const actor = item.actor_user_id
              ? profileMap.get(item.actor_user_id)
              : null;
            const target = item.target_user_id
              ? profileMap.get(item.target_user_id)
              : null;
            const itemReactions = reactionMap.get(item.id) ?? [];
            const itemComments = commentMap.get(item.id) ?? [];
            const latestComments = itemComments
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )
              .slice(0, 3);

            return (
              <div
                key={item.id}
                className="space-y-4 rounded-md border border-border/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">
                      {item.event_type.toUpperCase()} ·{" "}
                      {actor?.full_name || actor?.email || "System"}
                      {target ? ` -> ${target.full_name || target.email}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(item.data as { message?: string })?.message}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {itemReactions.length} likes
                    </Badge>
                    <Badge variant="outline">
                      {itemComments.length} comments
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={toggleActivityReaction}>
                    <input
                      type="hidden"
                      name="activity_event_id"
                      value={item.id}
                    />
                    <Button size="sm" type="submit" variant="outline">
                      Like
                    </Button>
                  </form>
                </div>

                <form action={addActivityComment} className="space-y-2">
                  <input
                    type="hidden"
                    name="activity_event_id"
                    value={item.id}
                  />
                  <textarea
                    name="body"
                    rows={2}
                    placeholder="Add a comment"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <Button size="sm" type="submit">
                    Comment
                  </Button>
                </form>

                {latestComments.length ? (
                  <div className="space-y-2 rounded-md bg-muted/40 p-3">
                    {latestComments.map((comment) => {
                      const commenter = profileMap.get(comment.user_id);
                      return (
                        <div key={comment.id} className="space-y-1">
                          <div className="text-xs font-medium text-foreground">
                            {commenter?.full_name || commenter?.email || comment.user_id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comment.body}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!activityRows.length ? (
            <div className="text-sm text-muted-foreground">No activity yet.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
