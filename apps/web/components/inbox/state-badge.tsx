import type { ConversationState } from "@marshaldesk/shared";
import { Badge } from "@/components/ui/badge";
import { stateLabel } from "@/lib/inbox/format";
import { cn } from "@/lib/utils";

function variantFor(state: ConversationState) {
  switch (state) {
    case "waiting":
      return "default";
    case "ai":
      return "secondary";
    case "human":
      return "outline";
    case "closed":
      return "ghost";
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

/**
 * `waiting` is the only filled badge, in the accent color, so what needs the
 * owner stands out without adding hues.
 */
export function StateBadge({
  state,
  className,
}: {
  state: ConversationState;
  className?: string;
}) {
  return (
    <Badge
      variant={variantFor(state)}
      className={cn(state === "closed" && "text-muted-foreground", className)}
    >
      {stateLabel(state)}
    </Badge>
  );
}
