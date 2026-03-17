import { requireActiveGym } from "@/lib/app/server";
import { markNotificationRead } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function NotificationsPage() {
  const { supabase, user, gym } = await requireActiveGym();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,type,title,body,read_at,created_at")
    .eq("gym_id", gym.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay on top of challenges, rewards, and retention alerts.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-3 text-sm text-muted-foreground">
          {notifications?.map((notification) => (
            <div
              key={notification.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium text-foreground">
                  {notification.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {notification.body}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{notification.type}</Badge>
                {notification.read_at ? (
                  <Badge variant="secondary">Read</Badge>
                ) : (
                  <form action={markNotificationRead}>
                    <input
                      type="hidden"
                      name="notification_id"
                      value={notification.id}
                    />
                    <Button size="sm" type="submit">
                      Mark read
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {!notifications?.length ? (
            <div className="text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
