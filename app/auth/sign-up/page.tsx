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
        <Suspense fallback={<SignUpForm redirectTo="/auth/redirect" />}>
          <ResolvedSignUpPage searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResolvedSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; accountType?: string }>;
}) {
  const { next, accountType } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/auth/redirect";
  const initialAccountType =
    accountType === "owner" || accountType === "member"
      ? (accountType as "owner" | "member")
      : undefined;

  return (
    <SignUpForm
      redirectTo={redirectTo}
      initialAccountType={initialAccountType}
    />
  );
}
