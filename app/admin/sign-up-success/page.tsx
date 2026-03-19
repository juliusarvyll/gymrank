import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminSignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-emerald-50 p-6 text-emerald-950 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Admin account created</CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your gym owner account has been created. Confirm your email before signing in to the admin workspace.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
