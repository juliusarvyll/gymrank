import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymForUser } from "@/lib/app/queries";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gym = await getActiveGymForUser(user.id);
  if (!gym) {
    return NextResponse.json({ error: "No active gym" }, { status: 400 });
  }

  const { data: checkins } = await supabase
    .from("checkins")
    .select("id,user_id,created_at,source,verified_by_user_id")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false });

  const rows = [
    ["id", "user_id", "created_at", "source", "verified_by_user_id"],
    ...(checkins ?? []).map((row) => [
      row.id,
      row.user_id,
      row.created_at,
      row.source,
      row.verified_by_user_id ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map(String).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="checkins-${gym.slug}.csv"`,
    },
  });
}
