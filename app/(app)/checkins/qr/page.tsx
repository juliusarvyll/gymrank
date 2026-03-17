import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymForUser } from "@/lib/app/queries";
import { createCheckinToken } from "@/lib/app/checkins";
import { Card } from "@/components/ui/card";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function CheckinQrPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const gym = await getActiveGymForUser(user.id);
  if (!gym) redirect("/app/onboarding");

  const token = await createCheckinToken(gym.id, user.id);
  const qrUrl = `${baseUrl}/app/checkins/qr/${token.token}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 256 });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your QR check-in</h1>
        <p className="text-sm text-muted-foreground">
          Show this to staff or scan to check in. Expires in 15 minutes.
        </p>
      </div>

      <Card className="p-6 flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Check-in QR code" className="h-64 w-64" />
        <div className="text-xs text-muted-foreground break-all">{qrUrl}</div>
      </Card>
    </div>
  );
}
