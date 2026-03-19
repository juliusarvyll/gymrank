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
  { href: "/", label: "Home", icon: Home },
  { href: "/check-in", label: "Check-In", icon: QrCode },
  { href: "/challenges", label: "Challenges", icon: Target },
  { href: "/community", label: "Community", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const secondaryNavItems: NavItem[] = [
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberSidebarNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Training
        </div>
        <nav aria-label="Primary member navigation" className="space-y-1">
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
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-emerald-900/72 hover:bg-emerald-50 hover:text-emerald-950",
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
          Extras
        </div>
        <nav aria-label="Secondary member navigation" className="space-y-1">
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
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-emerald-900/72 hover:bg-emerald-50 hover:text-emerald-950",
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
    <nav
      aria-label="Bottom member navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(6,78,59,0.08)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2">
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
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-emerald-900/60 hover:bg-emerald-50 hover:text-emerald-950",
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
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
        <Dumbbell className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-800">
          GymRank
        </div>
        <div className="text-base font-semibold text-emerald-950">Member Club</div>
      </div>
    </div>
  );
}
