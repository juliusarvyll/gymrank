"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Bell,
  Building2,
  ChartColumnBig,
  ClipboardCheck,
  Crown,
  Dumbbell,
  FileText,
  Gauge,
  Gift,
  Network,
  QrCode,
  ShieldCheck,
  Trophy,
  Users,
  UserRound,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "operations" | "engagement" | "platform";
  mobile?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge, group: "operations", mobile: true },
  { href: "/admin/members", label: "Members", icon: Users, group: "operations", mobile: true },
  { href: "/admin/membership-plans", label: "Plans", icon: WalletCards, group: "operations" },
  { href: "/admin/checkins", label: "Check-Ins", icon: ClipboardCheck, group: "operations", mobile: true },
  { href: "/admin/checkins/qr", label: "QR Desk", icon: QrCode, group: "operations" },
  { href: "/admin/classes", label: "Classes", icon: Dumbbell, group: "operations" },
  { href: "/admin/billing", label: "Billing", icon: FileText, group: "operations", mobile: true },
  { href: "/admin/challenges", label: "Challenges", icon: Trophy, group: "engagement", mobile: true },
  { href: "/admin/community", label: "Community", icon: UserRound, group: "engagement" },
  { href: "/admin/rewards", label: "Rewards", icon: Gift, group: "engagement" },
  { href: "/admin/leaderboards", label: "Leaderboards", icon: Crown, group: "engagement" },
  { href: "/admin/analytics", label: "Analytics", icon: ChartColumnBig, group: "platform", mobile: true },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, group: "platform" },
  { href: "/admin/networks", label: "Networks", icon: Network, group: "platform" },
  { href: "/admin/inter-gym", label: "Inter-Gym", icon: ShieldCheck, group: "platform" },
  { href: "/admin/gyms", label: "Gym Settings", icon: Building2, group: "platform" },
  { href: "/admin/profile", label: "Profile", icon: UserRound, group: "platform" },
];

const groups = [
  { key: "operations", label: "Daily Operations" },
  { key: "engagement", label: "Engagement Engine" },
  { key: "platform", label: "Platform Controls" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-800">
            {group.label}
          </div>
          <nav aria-label={group.label} className="space-y-1">
            {navItems
              .filter((item) => item.group === group.key)
              .map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                      active
                        ? "bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.22)]"
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
      ))}
    </div>
  );
}

export function AppBottomNav() {
  const pathname = usePathname();
  const mobileItems = navItems.filter((item) => item.mobile);

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_32px_rgba(6,78,59,0.08)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-6 gap-2">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-medium transition",
                active
                  ? "bg-emerald-500 text-white"
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

export function AppWordmark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-800">
          GymRank
        </div>
        <div className="text-base font-semibold text-emerald-950">Owner Control</div>
      </div>
    </div>
  );
}
