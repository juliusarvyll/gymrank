import Link from "next/link";
import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type AppShellProps = {
  children: ReactNode;
  gymName?: string | null;
  gymSlug?: string | null;
  role?: string | null;
};

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/members", label: "Members" },
  { href: "/app/checkins", label: "Check-ins" },
  { href: "/app/checkins/qr", label: "Check-in QR" },
  { href: "/app/classes", label: "Classes" },
  { href: "/app/challenges", label: "Challenges" },
  { href: "/app/leaderboards", label: "Leaderboards" },
  { href: "/app/community", label: "Community" },
  { href: "/app/rewards", label: "Rewards" },
  { href: "/app/networks", label: "Networks" },
  { href: "/app/inter-gym", label: "Inter-Gym" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/gyms", label: "Gym Settings" },
  { href: "/app/profile", label: "Profile" },
];

export function AppShell({ children, gymName, gymSlug, role }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-border/60 bg-muted/20">
          <div className="p-6 border-b border-border/60">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              GymRank
            </div>
            <div className="mt-2 text-lg font-semibold">
              {gymName ?? "Your Gym"}
            </div>
            {gymSlug ? (
              <div className="text-xs text-muted-foreground">@{gymSlug}</div>
            ) : null}
            {role ? (
              <Badge className="mt-2" variant="secondary">
                {role}
              </Badge>
            ) : null}
          </div>
          <nav className="px-3 py-4 space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="border-b border-border/60 px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur">
            <div className="text-sm text-muted-foreground">
              Engagement & retention command center
            </div>
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Marketing site
            </Link>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
