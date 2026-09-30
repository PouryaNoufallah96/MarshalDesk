"use client";

import { useNow } from "@/components/inbox/inbox-clock";
import { useHydrated } from "@/components/inbox/use-hydrated";
import { dateTime, relativeTime } from "@/lib/inbox/format";

/** Relative time; the exact date in the owner's own time zone shows on hover once hydrated. */
export function RelativeTime({ iso }: { iso: string }) {
  const now = useNow();
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} title={hydrated ? dateTime(iso) : undefined}>
      {relativeTime(iso, now)}
    </time>
  );
}
