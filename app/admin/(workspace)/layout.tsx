import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireOwnerOrStaffGym } from "@/lib/app/server";

export default function AdminWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-6 text-sm text-slate-300">Loading workspace...</div>
        </AppShell>
      }
    >
      <ResolvedAdminWorkspaceLayout>{children}</ResolvedAdminWorkspaceLayout>
    </Suspense>
  );
}

async function ResolvedAdminWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { gym, role } = await requireOwnerOrStaffGym();

  return (
    <AppShell gymName={gym?.name} gymSlug={gym?.slug} role={role?.role}>
      {children}
    </AppShell>
  );
}
