import { redirect } from "next/navigation";
import { consumeCheckinToken } from "@/lib/app/checkins";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function QrCheckinConsumePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  try {
    await consumeCheckinToken(params.token, user.id);
  } catch (error) {
    return (
      <div className="max-w-lg">
        <Card className="p-6 space-y-2">
          <h1 className="text-lg font-semibold">Unable to check in</h1>
          <p className="text-sm text-muted-foreground">
            {(error as Error).message}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Card className="p-6 space-y-2">
        <h1 className="text-lg font-semibold">Check-in confirmed</h1>
        <p className="text-sm text-muted-foreground">
          Your visit is logged. Keep the streak alive.
        </p>
      </Card>
    </div>
  );
}
