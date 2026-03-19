export type AuthSurface = "member" | "admin";
export type MembershipRole = "owner" | "staff" | "member" | null;

export function sanitizeAuthNextPath(next?: string | null, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export function getLogoutDestination(pathname: string | null | undefined) {
  return pathname?.startsWith("/admin") ? "/admin/login" : "/login";
}

export function getPostAuthDestination({
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
