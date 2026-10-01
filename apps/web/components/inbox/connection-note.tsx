import type { RealtimeStatus } from "@/lib/realtime/use-realtime-room";
import { cn } from "@/lib/utils";

function connectionCopy(status: RealtimeStatus): string | null {
  switch (status) {
    case "reconnecting":
      return "Reconnecting…";
    case "offline":
      return "You're offline";
    case "disabled":
    case "connecting":
    case "open":
      return null;
    default: {
      const unhandled: never = status;
      throw new Error(`Unhandled status: ${String(unhandled)}`);
    }
  }
}

/**
 * A live region that stays mounted, so screen readers announce it when the
 * connection drops. Messages that arrive meanwhile are fetched once it's back.
 */
export function ConnectionNote({
  status,
  className,
}: {
  status: RealtimeStatus;
  className?: string;
}) {
  const copy = connectionCopy(status);
  return (
    <span
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {copy ? (
        <>
          <span
            aria-hidden
            className="size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
          />
          {copy}
        </>
      ) : null}
    </span>
  );
}
