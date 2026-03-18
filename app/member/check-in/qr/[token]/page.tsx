import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { consumeCheckinToken } from "@/lib/app/checkins";
import { createClient } from "@/lib/supabase/server";

export default function MemberQrConsumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg rounded-[32px] border border-white/80 bg-white/85 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">Confirming your visit...</div>}>
      <MemberQrConsumeContent params={params} />
    </Suspense>
  );
}

async function MemberQrConsumeContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/member/check-in");
  }

  const { token } = await params;

  try {
    await consumeCheckinToken(token, user.id);
  } catch (error) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="rounded-[32px] border-white/80 bg-white/92 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 text-rose-600">
            <CircleAlert className="h-6 w-6" />
            <h1 className="text-xl font-semibold text-slate-950">Unable to check in</h1>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">{(error as Error).message}</p>
          <Button asChild className="mt-6 rounded-2xl">
            <Link href="/member/check-in">Back to check-in</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card className="rounded-[32px] border-white/80 bg-white/92 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3 text-emerald-600">
          <BadgeCheck className="h-6 w-6" />
          <h1 className="text-xl font-semibold text-slate-950">Check-in confirmed</h1>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your visit is recorded. Keep stacking sessions and watch the feed respond.
        </p>
        <Button asChild className="mt-6 rounded-2xl">
          <Link href="/member">Return home</Link>
        </Button>
      </Card>
    </div>
  );
}
