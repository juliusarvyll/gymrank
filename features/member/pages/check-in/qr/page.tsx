import { Suspense } from "react";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireMemberGym } from "@/lib/app/server";
import { createCheckinToken } from "@/lib/app/checkins";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default function MemberCheckInQrPage() {
  return (
    <Suspense fallback={<div className="rounded-[32px] border border-emerald-100 bg-white p-6 text-sm text-slate-500 shadow-sm">Generating your QR pass...</div>}>
      <MemberCheckInQrContent />
    </Suspense>
  );
}

async function MemberCheckInQrContent() {
  const { gym, user } = await requireMemberGym("/login?next=/check-in/qr");

  const token = await createCheckinToken(gym.id, user.id);
  const qrUrl = `${baseUrl}/check-in/qr/${token.token}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 320 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_52%,#0ea5e9_160%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.24)] sm:p-8">
        <Badge className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100">
          Member QR
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Show this pass when you hit the gym floor.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Staff can scan it, or you can scan it yourself. The token expires in 15 minutes.
        </p>
      </section>

      <Card className="rounded-[32px] border-white/80 bg-white/92 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <div className="rounded-[32px] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Member QR check-in code" className="h-72 w-72 max-w-full rounded-[24px]" />
          </div>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-slate-950">{gym.name}</div>
            <div className="text-sm text-slate-500">Keep this screen visible for the scanner.</div>
          </div>
          <div className="w-full rounded-[24px] bg-slate-50 px-4 py-3 text-xs text-slate-500 break-all">
            {qrUrl}
          </div>
        </div>
      </Card>
    </div>
  );
}
