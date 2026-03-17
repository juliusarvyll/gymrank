import { createGym } from "./actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your gym</h1>
        <p className="text-sm text-muted-foreground">
          Start by setting up your gym profile. You can add branches, staff, and
          members next.
        </p>
      </div>

      <Card className="p-6">
        <form action={createGym} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Gym name</Label>
            <Input id="name" name="name" placeholder="Iron Haven Fitness" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Gym slug</Label>
            <Input id="slug" name="slug" placeholder="iron-haven" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" name="timezone" placeholder="Asia/Manila" />
          </div>
          <Button type="submit">Create gym</Button>
        </form>
      </Card>
    </div>
  );
}
