import { ReactNode, Suspense } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AppBottomNav,
  AppSidebarNav,
  AppWordmark,
} from "@/components/app/app-nav";

type AppShellProps = {
  children: ReactNode;
  gymName?: string | null;
  gymSlug?: string | null;
  role?: string | null;
};

function AppNavFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Daily Operations
        </div>
        <div className="space-y-1">
          {["Overview", "Members", "Check-Ins", "Classes"].map((item) => (
            <div key={item} className="rounded-2xl px-4 py-3 text-sm text-emerald-900/70">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Engagement Engine
        </div>
        <div className="space-y-1">
          {["Challenges", "Community", "Rewards", "Leaderboards"].map((item) => (
            <div key={item} className="rounded-2xl px-4 py-3 text-sm text-emerald-900/70">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppBottomNavFallback() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(6,78,59,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-6 gap-2">
        {["Overview", "Members", "Check-Ins", "Billing", "Challenges", "Analytics"].map((item) => (
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

export function AppShell({ children, gymName, gymSlug, role }: AppShellProps) {
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
          <AppWordmark />
          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
              {gymName ?? "Your Gym"}
              {gymSlug ? <span className="ml-2 text-emerald-800">@{gymSlug}</span> : null}
            </div>
            {role ? (
              <Badge className="rounded-full border-none bg-emerald-500 px-3 py-1 capitalize text-white">
                {role}
              </Badge>
            ) : null}
          </div>
          <div className="hidden rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-medium text-emerald-900 md:block">
            Admin surface
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:pb-10 lg:pt-8"
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(6,78,59,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                    Admin Surface
                  </div>
                  <div className="mt-2 text-xl font-semibold text-emerald-950">
                    {gymName ?? "Your Gym"}
                  </div>
                  {gymSlug ? (
                    <div className="text-sm text-emerald-900/65">@{gymSlug}</div>
                  ) : null}
                </div>
                {role ? (
                  <Badge className="rounded-full border-none bg-emerald-500 px-3 py-1 capitalize text-white">
                    {role}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-[0_20px_50px_rgba(6,78,59,0.06)]">
              <Suspense fallback={<AppNavFallback />}>
                <AppSidebarNav />
              </Suspense>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-100 p-5 text-emerald-950 shadow-[0_20px_50px_rgba(6,95,70,0.08)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800">
                <Sparkles className="h-4 w-4" />
                Command Mode
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                This workspace is for staff operations, retention controls, and gym-level visibility.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 grid gap-3 lg:hidden">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-[0_20px_50px_rgba(6,78,59,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
                Owner Console
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
                  <Badge className="rounded-full border-none bg-emerald-500 px-3 py-1 capitalize text-white">
                    {role}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-[0_20px_50px_rgba(6,78,59,0.06)] sm:p-6">
            {children}
          </div>
        </div>
      </main>

      <Suspense fallback={<AppBottomNavFallback />}>
        <AppBottomNav />
      </Suspense>
    </div>
  );
}
