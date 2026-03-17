import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymForUser } from "@/lib/app/queries";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

export async function requireActiveGym() {
  const { supabase, user } = await requireUser();
  const gym = await getActiveGymForUser(user.id);
  if (!gym) redirect("/app/onboarding");
  return { supabase, user, gym };
}
