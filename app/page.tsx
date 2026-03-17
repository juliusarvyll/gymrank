import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <header className="flex items-center justify-between">
          <div className="text-sm uppercase tracking-widest text-muted-foreground">
            GymRank
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app">Open dashboard</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight">
              Retention-first engagement for modern gyms.
            </h1>
            <p className="text-lg text-muted-foreground">
              Turn daily check-ins into streaks, challenges, and community
              momentum. Prove ROI with attendance and retention analytics.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/app/onboarding">Create your gym</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app">View demo dashboard</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-8">
            <div className="text-xs uppercase text-muted-foreground">
              Core modules
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Check-in verification + attendance tracking</li>
              <li>Gamified XP, streaks, and challenges</li>
              <li>Leaderboards, community feed, and rewards</li>
              <li>Retention alerts and analytics dashboards</li>
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Engagement loops",
              copy: "Weekly challenges and streak prompts keep members returning.",
            },
            {
              title: "Retention intelligence",
              copy: "Spot drop-offs early with inactivity alerts and trends.",
            },
            {
              title: "Gym-level ROI",
              copy: "Tie engagement to retention metrics for ownership buy-in.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/60 p-6 bg-background"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
