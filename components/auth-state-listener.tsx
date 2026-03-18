"use client";

import { startTransition, useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthStateListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
