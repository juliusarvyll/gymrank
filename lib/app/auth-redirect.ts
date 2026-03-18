import type { User } from "@supabase/supabase-js";
import { getActiveGymForUser, getUserMembershipRole } from "@/lib/app/queries";

export async function resolvePostAuthRedirect(user: User) {
  const gym = await getActiveGymForUser(user.id);

  if (gym) {
    const membership = await getUserMembershipRole(user.id, gym.id);
    if (membership?.role === "owner" || membership?.role === "staff") {
      return "/app";
    }

    return "/member";
  }

  if (user.user_metadata?.account_type === "owner") {
    return "/app/onboarding";
  }

  return "/member";
}
