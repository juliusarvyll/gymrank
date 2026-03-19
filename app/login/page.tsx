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
        <Suspense
          fallback={
            <LoginForm
              redirectTo="/member-auth/redirect"
              signUpHref="/sign-up"
              forgotPasswordHref="/forgot-password"
            />
          }
        >
          <ResolvedMemberLoginPage searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResolvedMemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo =
    next && next.startsWith("/")
      ? next
      : "/member-auth/redirect";

  return (
    <LoginForm
      redirectTo={redirectTo}
      signUpHref={`/sign-up?next=${encodeURIComponent(redirectTo)}`}
      forgotPasswordHref="/forgot-password"
    />
  );
}
