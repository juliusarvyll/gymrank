import { Suspense } from "react";
import { BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActiveGym } from "@/lib/app/server";
import { markNotificationRead } from "@/app/app/notifications/actions";

export default function MemberNotificationsPage() {
  return (
    <Suspense fallback={<div className="rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">Loading notifications...</div>}>
      <MemberNotificationsContent />
    </Suspense>
  );
}

async function MemberNotificationsContent() {
  const { supabase, user, gym } = await requireActiveGym();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,type,title,body,read_at,created_at")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#082f49_0%,#0f172a_46%,#38bdf8_160%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.22)] sm:p-8">
        <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
          Notification Center
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Keep the signal, drop the noise.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Challenge completions, reward updates, and gym nudges land here.
        </p>
      </section>

      <div className="space-y-4">
        {notifications?.map((notification) => (
          <Card key={notification.id} className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">{notification.title}</h2>
                  <Badge className="rounded-full" variant="outline">
                    {notification.type}
                  </Badge>
                  {notification.read_at ? (
                    <Badge className="rounded-full" variant="secondary">
                      Read
                    </Badge>
                  ) : (
                    <Badge className="rounded-full">New</Badge>
                  )}
                </div>
                <p className="text-sm leading-6 text-slate-500">{notification.body}</p>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="text-xs text-slate-400">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
                {!notification.read_at ? (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="notification_id" value={notification.id} />
                    <Button type="submit" className="min-h-10 rounded-full px-4">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </Card>
        ))}

        {!notifications?.length ? (
          <Card className="rounded-[32px] border-white/80 bg-white/92 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              No notifications yet.
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
