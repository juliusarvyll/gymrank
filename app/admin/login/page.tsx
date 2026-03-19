import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-emerald-50 p-4 text-emerald-950 sm:p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <LoginForm
              redirectTo="/admin/auth/redirect"
              signUpHref="/admin/sign-up"
              forgotPasswordHref="/admin/forgot-password"
            />
          }
        >
          <ResolvedAdminLoginPage searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResolvedAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo =
    next && next.startsWith("/")
      ? next
      : "/admin/auth/redirect";

  return (
    <LoginForm
      redirectTo={redirectTo}
      signUpHref={`/admin/sign-up?next=${encodeURIComponent(redirectTo)}&accountType=owner`}
      forgotPasswordHref="/admin/forgot-password"
    />
  );
}
