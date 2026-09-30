import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Inbox } from "@/components/inbox/inbox";
import { resolveAvatarUrl } from "@/lib/avatar";
import {
  INBOX_LAYOUT_COOKIE,
  parseInboxLayout,
} from "@/lib/inbox/layout-cookie";
import { MOCK_AGENT_NAME } from "@/lib/inbox/mock-data";

function requestTime(): number {
  return Date.now();
}

export default async function InboxLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultLayout = parseInboxLayout(
    cookieStore.get(INBOX_LAYOUT_COOKIE)?.value,
  );
  const agent = {
    name: MOCK_AGENT_NAME,
    avatarUrl: resolveAvatarUrl({ name: MOCK_AGENT_NAME, avatarUrl: null }),
  };

  return (
    <div className="h-[calc(100svh-var(--header-height))] min-h-0 overflow-hidden md:h-[calc(100svh-var(--header-height)-1rem)]">
      <Inbox
        initialNow={requestTime()}
        agent={agent}
        defaultLayout={defaultLayout}
      />
      {children}
    </div>
  );
}
