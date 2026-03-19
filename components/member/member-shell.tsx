import { ReactNode, Suspense } from "react";
import { MapPin, Sparkles } from "lucide-react";
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Training
        </div>
        <div className="space-y-1">
          {["Home", "Check-In", "Challenges", "Community", "Profile"].map((item) => (
            <div key={item} className="rounded-2xl px-4 py-3 text-sm text-emerald-900/65">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Extras
        </div>
        <div className="space-y-1">
          {["Rewards", "Notifications"].map((item) => (
            <div key={item} className="rounded-2xl px-4 py-3 text-sm text-emerald-900/65">
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(6,78,59,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2">
        {["Home", "Check-In", "Challenges", "Community", "Profile"].map((item) => (
          <div
            key={item}
            className="flex min-h-16 items-center justify-center rounded-2xl px-2 text-[11px] font-medium text-emerald-900/60"
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
    <div className="min-h-screen bg-emerald-50 text-emerald-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-emerald-950 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <MemberWordmark />
          <div className="hidden items-center gap-2 text-sm text-emerald-900 sm:flex">
            <MapPin className="h-4 w-4" />
            <span>{gymName ?? "Your Gym"}</span>
            {gymSlug ? <span className="text-emerald-700/40">/</span> : null}
            {gymSlug ? <span>@{gymSlug}</span> : null}
          </div>
          <div className="hidden rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900 md:block">
            Member surface
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:pb-10 lg:pt-8"
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(6,78,59,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                    Active Gym
                  </div>
                  <div className="mt-2 text-lg font-semibold text-emerald-950">
                    {gymName ?? "Your Gym"}
                  </div>
                  {gymSlug ? (
                    <div className="text-sm text-emerald-900/65">@{gymSlug}</div>
                  ) : null}
                </div>
                {role ? (
                  <Badge className="rounded-full px-3 py-1 capitalize" variant="secondary">
                    {role}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-[0_20px_50px_rgba(6,78,59,0.06)]">
              <Suspense fallback={<MemberNavFallback />}>
                <MemberSidebarNav />
              </Suspense>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-100 p-5 text-emerald-950 shadow-[0_20px_50px_rgba(6,95,70,0.08)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800">
                <Sparkles className="h-4 w-4" />
                Momentum
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                Keep the member surface focused on movement, streaks, and social proof.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 grid gap-3 lg:hidden">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-[0_20px_50px_rgba(6,78,59,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Member Surface
              </div>
              <div className="mt-2 text-lg font-semibold text-emerald-950">
                {gymName ?? "Your Gym"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {gymSlug ? (
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-900/70">
                    @{gymSlug}
                  </div>
                ) : null}
                {role ? (
                  <Badge className="rounded-full px-3 py-1 capitalize" variant="secondary">
                    {role}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {children}
        </div>
      </main>

      <Suspense fallback={<MemberBottomNavFallback />}>
        <MemberBottomNav />
      </Suspense>
    </div>
  );
}
