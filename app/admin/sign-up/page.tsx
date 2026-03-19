import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; accountType?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-emerald-50 p-4 text-emerald-950 sm:p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <SignUpForm
              redirectTo="/admin/auth/redirect"
              initialAccountType="owner"
              loginHref="/admin/login"
              successRedirectTo="/admin/sign-up-success"
            />
          }
        >
          <ResolvedAdminSignUpPage searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResolvedAdminSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; accountType?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo =
    next && next.startsWith("/")
      ? next
      : "/admin/auth/redirect";

  return (
    <SignUpForm
      redirectTo={redirectTo}
      initialAccountType="owner"
      loginHref={`/admin/login?next=${encodeURIComponent(redirectTo)}`}
      successRedirectTo="/admin/sign-up-success"
    />
  );
}
