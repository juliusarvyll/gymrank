"use client";

import { createClient } from "@/lib/supabase/client";
import { getLogoutDestination } from "@/lib/app/auth-routing";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { ComponentProps } from "react";

type LogoutButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  label?: string;
};

export function LogoutButton({
  label = "Logout",
  type = "button",
  ...props
}: LogoutButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logout = async () => {
    if (isLoggingOut) return;

    const supabase = createClient();
    setIsLoggingOut(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message || "Unable to log out right now.");
      setIsLoggingOut(false);
      return;
    }

    startTransition(() => {
      router.replace(getLogoutDestination(pathname));
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <Button type={type} onClick={logout} disabled={isLoggingOut || props.disabled} {...props}>
        {isLoggingOut ? "Logging out..." : label}
      </Button>
      {errorMessage ? (
        <div className="text-sm text-destructive">{errorMessage}</div>
      ) : null}
    </div>
  );
}
