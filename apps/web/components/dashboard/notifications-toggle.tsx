"use client";

import { BellIcon, BellOffIcon, BellRingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  turnOffNotifications,
  turnOnNotifications,
  useNotificationSetting,
} from "@/lib/realtime/notifications";

/** Browser notifications are opt-in: the permission prompt only follows a click here. */
export function NotificationsToggle() {
  const setting = useNotificationSetting();

  switch (setting) {
    case "unsupported":
      return null;
    case "off":
      return (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => void turnOnNotifications()}
        >
          <BellIcon data-icon="inline-start" />
          Turn on notifications
        </Button>
      );
    case "on":
      return (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={turnOffNotifications}
          title="You get a browser notification when a visitor writes to a conversation that needs you. Click to turn them off."
        >
          <BellRingIcon data-icon="inline-start" />
          Notifications on
        </Button>
      );
    case "blocked":
      return (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          disabled
          title="Your browser blocks notifications for this site. Allow them in the site settings to turn them on."
        >
          <BellOffIcon data-icon="inline-start" />
          Notifications blocked
        </Button>
      );
    default: {
      const unhandled: never = setting;
      throw new Error(`Unhandled setting: ${String(unhandled)}`);
    }
  }
}
