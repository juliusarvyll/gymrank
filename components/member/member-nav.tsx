"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Bell,
  Dumbbell,
  Gift,
  Home,
  QrCode,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const primaryNavItems: NavItem[] = [
  { href: "/member", label: "Home", icon: Home },
  { href: "/member/check-in", label: "Check-In", icon: QrCode },
  { href: "/member/challenges", label: "Challenges", icon: Target },
  { href: "/member/community", label: "Community", icon: Users },
  { href: "/member/profile", label: "Profile", icon: UserRound },
];

const secondaryNavItems: NavItem[] = [
  { href: "/member/rewards", label: "Rewards", icon: Gift },
  { href: "/member/notifications", label: "Notifications", icon: Bell },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberSidebarNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/70">
          Training
        </div>
        <nav className="space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-sky-950/15"
                    : "text-slate-600 hover:bg-white hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Extras
        </div>
        <nav className="space-y-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-sky-950/15"
                    : "text-slate-600 hover:bg-white hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-medium transition",
                active
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MemberWordmark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
        <Dumbbell className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700/70">
          GymRank
        </div>
        <div className="text-base font-semibold text-slate-950">Member Club</div>
      </div>
    </div>
  );
}
