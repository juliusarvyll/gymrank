import { Suspense } from "react";
import { MessageCircleHeart, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActiveGym } from "@/lib/app/server";
import {
  addActivityComment,
  postShoutout,
  toggleActivityReaction,
} from "@/app/app/community/actions";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ReactionRow = {
  id: string;
  activity_event_id: string;
  user_id: string;
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
  data: { message?: string; source?: string } | null;
  created_at: string;
  actor_user_id: string | null;
  target_user_id: string | null;
};

function getActivityHeadline(item: ActivityRow, actorName: string, targetName: string | null) {
  if (item.event_type === "shoutout") {
    return `${actorName} posted a shoutout`;
  }

  if (item.event_type === "checkin") {
    const subject = targetName ?? actorName;
    return `${subject} checked in`;
  }

  return `${actorName} posted to the community`;
}

export default function MemberCommunityPage() {
  return (
    <Suspense fallback={<div className="rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">Loading community feed...</div>}>
      <MemberCommunityContent />
    </Suspense>
  );
}

async function MemberCommunityContent() {
  const { supabase, gym, user } = await requireActiveGym();

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
          .select("id,activity_event_id,user_id")
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
    ? await supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
    : { data: [] as ProfileRow[] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

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
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#020617_0%,#172554_42%,#0ea5e9_160%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.24)] sm:p-8">
        <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
          Community Feed
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          The social layer of your gym.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Shout out progress, celebrate wins, and react to the people building consistency around you.
        </p>
      </section>

      <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">
          <MessageCircleHeart className="h-4 w-4" />
          Post to the club
        </div>
        <form action={postShoutout} className="mt-5 space-y-3">
          <input type="hidden" name="target_user_id" value="" />
          <textarea
            name="message"
            rows={3}
            placeholder="Shoutout to the evening crew for showing up all week."
            className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300"
          />
          <Button type="submit" className="min-h-11 rounded-full px-5">
            Post shoutout
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {activityRows.map((item) => {
          const actor = item.actor_user_id ? profileMap.get(item.actor_user_id) : null;
          const target = item.target_user_id ? profileMap.get(item.target_user_id) : null;
          const actorName = actor?.full_name || actor?.email || "Member";
          const targetName = target?.full_name || target?.email || null;
          const itemReactions = reactionMap.get(item.id) ?? [];
          const itemComments = commentMap.get(item.id) ?? [];
          const latestComments = itemComments
            .slice()
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .slice(0, 3);
          const hasReacted = itemReactions.some((reaction) => reaction.user_id === user.id);

          return (
            <Card key={item.id} className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {getActivityHeadline(item, actorName, targetName)}
                    </h2>
                    <Badge className="rounded-full" variant="outline">
                      {item.event_type}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">
                    {item.data?.message ||
                      (item.event_type === "checkin"
                        ? `${targetName ?? actorName} logged a gym visit.`
                        : "Club activity is moving.")}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full" variant="secondary">
                  {itemReactions.length} likes
                </Badge>
                <Badge className="rounded-full" variant="outline">
                  {itemComments.length} comments
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <form action={toggleActivityReaction}>
                  <input type="hidden" name="activity_event_id" value={item.id} />
                  <Button type="submit" variant={hasReacted ? "default" : "outline"} className="min-h-10 rounded-full px-4">
                    <ThumbsUp className="h-4 w-4" />
                    {hasReacted ? "Liked" : "Like"}
                  </Button>
                </form>
              </div>

              <form action={addActivityComment} className="mt-4 space-y-3">
                <input type="hidden" name="activity_event_id" value={item.id} />
                <textarea
                  name="body"
                  rows={2}
                  placeholder="Add a comment"
                  className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                />
                <Button type="submit" className="min-h-10 rounded-full px-4">
                  Comment
                </Button>
              </form>

              {latestComments.length ? (
                <div className="mt-4 space-y-3 rounded-[24px] bg-slate-50/90 p-4">
                  {latestComments.map((comment) => {
                    const commenter = profileMap.get(comment.user_id);

                    return (
                      <div key={comment.id} className="rounded-[18px] border border-slate-100 bg-white px-4 py-3">
                        <div className="text-sm font-medium text-slate-950">
                          {commenter?.full_name || commenter?.email || "Member"}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">{comment.body}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          );
        })}

        {!activityRows.length ? (
          <Card className="rounded-[32px] border-white/80 bg-white/92 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            No community activity yet.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
