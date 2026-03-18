import Link from "next/link";
import { ReactNode, Suspense } from "react";
import { ChevronRight, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  MemberBottomNav,
  MemberSidebarNav,
  MemberWordmark,
} from "@/components/member/member-nav";

type MemberShellProps = {
  children: ReactNode;
  gymName?: string | null;
  gymSlug?: string | null;
  role?: string | null;
};

function MemberNavFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/70">
          Training
        </div>
        <div className="space-y-1">
          {["Home", "Check-In", "Challenges", "Community", "Profile"].map((item) => (
            <div key={item} className="rounded-2xl px-4 py-3 text-sm text-slate-500">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Extras
        </div>
        <div className="space-y-1">
          {["Rewards", "Notifications"].map((item) => (
            <div key={item} className="rounded-2xl px-4 py-3 text-sm text-slate-500">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberBottomNavFallback() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
        {["Home", "Check-In", "Challenges", "Community", "Profile"].map((item) => (
          <div
            key={item}
            className="flex min-h-16 items-center justify-center rounded-2xl px-2 text-[11px] font-medium text-slate-500"
          >
            {item}
          </div>
        ))}
      </div>
    </nav>
  );
}

export function MemberShell({
  children,
  gymName,
  gymSlug,
  role,
}: MemberShellProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef8ff_0%,#f8fafc_24%,#f8fafc_100%)] text-slate-950">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_58%)]"
        aria-hidden
      />

      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <MemberWordmark />
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <MapPin className="h-4 w-4" />
            <span>{gymName ?? "Your Gym"}</span>
            {gymSlug ? <span className="text-slate-300">/</span> : null}
            {gymSlug ? <span>@{gymSlug}</span> : null}
          </div>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Staff workspace
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl gap-6 px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pb-10 lg:pt-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/70">
                    Active Gym
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">
                    {gymName ?? "Your Gym"}
                  </div>
                  {gymSlug ? (
                    <div className="text-sm text-slate-500">@{gymSlug}</div>
                  ) : null}
                </div>
                {role ? (
                  <Badge className="rounded-full px-3 py-1 capitalize" variant="secondary">
                    {role}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <Suspense fallback={<MemberNavFallback />}>
                <MemberSidebarNav />
              </Suspense>
            </div>

            <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_24px_60px_rgba(2,6,23,0.26)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">
                <Sparkles className="h-4 w-4" />
                Momentum
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Keep the member surface focused on movement, streaks, and social proof.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </main>

      <Suspense fallback={<MemberBottomNavFallback />}>
        <MemberBottomNav />
      </Suspense>
    </div>
  );
}
