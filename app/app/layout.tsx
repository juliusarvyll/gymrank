import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/app/server";
import { getActiveGymForUser, getUserMembershipRole } from "@/lib/app/queries";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-6 text-sm text-muted-foreground">
            Loading workspace...
          </div>
        </AppShell>
      }
    >
      <ResolvedAppLayout>{children}</ResolvedAppLayout>
    </Suspense>
  );
}

async function ResolvedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();

  const gym = await getActiveGymForUser(user.id);
  const role = gym ? await getUserMembershipRole(user.id, gym.id) : null;

  return (
    <AppShell gymName={gym?.name} gymSlug={gym?.slug} role={role?.role}>
      {children}
    </AppShell>
  );
}
