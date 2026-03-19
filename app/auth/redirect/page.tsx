import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/app/server";

export default function AuthRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ surface?: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-background" />}>
      <ResolvedAuthRedirectPage searchParams={searchParams} />
    </Suspense>
  );
}

async function ResolvedAuthRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ surface?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const surface =
    resolvedSearchParams?.surface === "admin"
      ? "admin"
      : resolvedSearchParams?.surface === "member"
        ? "member"
        : undefined;
  const loginPath = surface === "admin" ? "/admin/login" : "/login";
  await requireUser(loginPath);

  redirect(surface === "admin" ? "/admin/auth/redirect" : "/member-auth/redirect");

  return null;
}
