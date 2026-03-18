import Link from "next/link";
import { Suspense } from "react";
import { Clock3, Flame, MapPin, QrCode, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActiveGym } from "@/lib/app/server";
import { createCheckin } from "@/app/app/checkins/actions";

export default function MemberCheckInPage() {
  return (
    <Suspense fallback={<div className="rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">Loading check-in lane...</div>}>
      <MemberCheckInContent />
    </Suspense>
  );
}

async function MemberCheckInContent() {
  const { supabase, user, gym } = await requireActiveGym();

  const [{ data: stats }, { data: checkins }] = await Promise.all([
    supabase
      .from("member_stats")
      .select("total_checkins,current_streak,longest_streak,last_checkin_at")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("id,created_at,source,notes")
      .eq("gym_id", gym.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden rounded-[32px] border-none bg-[linear-gradient(135deg,#0284c7_0%,#0f172a_120%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.2)] sm:p-8">
          <div className="space-y-5">
            <Badge className="w-fit rounded-full border-none bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
              Check-In Lane
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Log the session and keep the streak alive.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-sky-100/90 sm:text-base">
                Use one-tap check-in when you arrive, or keep your QR pass ready for the desk.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <form action={createCheckin}>
                <Button
                  type="submit"
                  className="min-h-11 rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100"
                >
                  Check in now
                </Button>
              </form>
              <Button
                asChild
                type="button"
                variant="outline"
                className="min-h-11 rounded-full border-white/25 bg-white/10 px-5 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/member/check-in/qr">Open QR pass</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">
            Current Rhythm
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Flame className="h-4 w-4 text-orange-500" />
                Current streak
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{stats?.current_streak ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">days in a row</div>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Sparkles className="h-4 w-4 text-sky-500" />
                Total check-ins
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">{stats?.total_checkins ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">all-time visits</div>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="h-4 w-4 text-sky-500" />
                Last visit
              </div>
              <div className="mt-3 text-base font-semibold text-slate-950">
                {stats?.last_checkin_at
                  ? new Date(stats.last_checkin_at).toLocaleDateString()
                  : "Not yet"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stats?.last_checkin_at
                  ? new Date(stats.last_checkin_at).toLocaleTimeString()
                  : "Your first check-in starts the history"}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">
                Visit History
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Recent sessions</h2>
            </div>
            <Badge className="rounded-full" variant="outline">
              {checkins?.length ?? 0} listed
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {checkins?.map((checkin) => (
              <div key={checkin.id} className="flex flex-col gap-3 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">Gym visit</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {checkin.notes?.trim() || "Session logged successfully."}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge className="rounded-full" variant="secondary">
                    {checkin.source.toUpperCase()}
                  </Badge>
                  <span>{new Date(checkin.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {!checkins?.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
                No visits logged yet. Use the button above when you arrive at {gym.name}.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">
            Desk Ready
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Front-desk QR flow</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Open a temporary QR code when you want staff or a kiosk to verify your arrival.
          </p>
          <div className="mt-5 rounded-[24px] bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-sky-200">
              <QrCode className="h-4 w-4" />
              Scan friendly
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-300">
              Tokens expire quickly, so the QR lane stays fresh and safe.
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <Button asChild className="min-h-12 rounded-2xl">
              <Link href="/member/check-in/qr">Open QR pass</Link>
            </Button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="h-4 w-4" />
              Works for your currently active gym
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
