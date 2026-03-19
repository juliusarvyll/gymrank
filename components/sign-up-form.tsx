"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function SignUpForm({
  className,
  redirectTo = "/auth/redirect",
  initialAccountType,
  loginHref,
  successRedirectTo,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  redirectTo?: string;
  initialAccountType?: "member" | "owner";
  loginHref?: string;
  successRedirectTo?: string;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [accountType, setAccountType] = useState(initialAccountType ?? "member");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const errorId = "sign-up-form-error";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: accountType,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
      startTransition(() => {
        router.replace(successRedirectTo ?? "/sign-up-success");
        router.refresh();
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-type">Account type</Label>
                <select
                  id="account-type"
                  value={accountType}
                  onChange={(e) =>
                    setAccountType(e.target.value as "member" | "owner")
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={Boolean(initialAccountType)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                >
                  <option value="member">Gym-goer</option>
                  <option value="owner">Gym owner</option>
                </select>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              {error ? (
                <p
                  id={errorId}
                  role="alert"
                  aria-live="assertive"
                  className="text-sm text-red-700"
                >
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href={loginHref ?? `/login?next=${encodeURIComponent(redirectTo)}`}
                className="underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
