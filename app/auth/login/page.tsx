import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<LoginForm redirectTo="/app" />}>
          <ResolvedLoginPage searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResolvedLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/app";

  return <LoginForm redirectTo={redirectTo} />;
}
