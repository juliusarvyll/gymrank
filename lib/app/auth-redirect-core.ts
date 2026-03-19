import type { User } from "@supabase/supabase-js";

type AuthSurface = "member" | "admin";
type MembershipRole = "owner" | "staff" | "member" | null;

function getPostAuthDestination({
  surface,
  hasGym,
  membershipRole,
  accountType,
}: {
  surface: AuthSurface;
  hasGym: boolean;
  membershipRole: MembershipRole;
  accountType?: string | null;
}) {
  if (hasGym) {
    if (membershipRole === "owner" || membershipRole === "staff") {
      return "/admin";
    }

    return "/";
  }

  if (accountType === "owner") {
    return "/admin/onboarding";
  }

  if (surface === "admin") {
    return "/";
  }

  return "/";
}

export type AuthRedirectDeps = {
  getActiveGymForUser: (userId: string) => Promise<{ id: string } | null>;
  getUserMembershipRole: (
    userId: string,
    gymId: string,
  ) => Promise<{ role: string; status: string } | null>;
};

export async function resolveSurfacePostAuthRedirect(
  user: User,
  surface: AuthSurface,
  deps: AuthRedirectDeps,
) {
  const gym = await deps.getActiveGymForUser(user.id);

  if (gym) {
    const membership = await deps.getUserMembershipRole(user.id, gym.id);
    return getPostAuthDestination({
      surface,
      hasGym: true,
      membershipRole:
        membership?.role === "owner" || membership?.role === "staff" || membership?.role === "member"
          ? membership.role
          : null,
      accountType: user.user_metadata?.account_type,
    });
  }

  return getPostAuthDestination({
    surface,
    hasGym: false,
    membershipRole: null,
    accountType: user.user_metadata?.account_type,
  });
}
