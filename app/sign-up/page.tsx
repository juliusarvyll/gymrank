import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; accountType?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <SignUpForm
              redirectTo="/member-auth/redirect"
              loginHref="/login"
              successRedirectTo="/sign-up-success"
            />
          }
        >
          <ResolvedMemberSignUpPage searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResolvedMemberSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; accountType?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo =
    next && next.startsWith("/")
      ? next
      : "/member-auth/redirect";

  return (
    <SignUpForm
      redirectTo={redirectTo}
      initialAccountType="member"
      loginHref={`/login?next=${encodeURIComponent(redirectTo)}`}
      successRedirectTo="/sign-up-success"
    />
  );
}
