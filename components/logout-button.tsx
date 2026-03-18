"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace("/auth/login");
      router.refresh();
    });
  };

  return <Button onClick={logout}>Logout</Button>;
}
