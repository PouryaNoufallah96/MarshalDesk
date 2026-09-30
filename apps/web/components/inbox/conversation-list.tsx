"use client";

import type { ConversationSummary } from "@marshaldesk/shared";
import {
  CodeXmlIcon,
  InboxIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useWorkspaceRealtimeStatus } from "@/components/dashboard/dashboard-realtime";
import { useNow } from "@/components/inbox/inbox-clock";
import { useConversations } from "@/components/inbox/use-inbox";
import { VisitorAvatar } from "@/components/inbox/participant-avatar";
import { StateBadge } from "@/components/inbox/state-badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  compareConversations,
  countByFilter,
  INBOX_FILTERS,
  type InboxFilter,
  matchesFilter,
  matchesSearch,
  parseFilter,
} from "@/lib/inbox/filter";
import {
  compactAge,
  filterLabel,
  handoffReasonLabel,
  stripMarkdown,
  visitorLabel,
} from "@/lib/inbox/format";
import type { RealtimeStatus } from "@/lib/realtime/use-realtime-room";
import { inboxRoute, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

function filterParam(filter: InboxFilter): string | undefined {
  return filter === "open" ? undefined : filter;
}

function emptyCopy(filter: InboxFilter): {
  title: string;
  description: string;
} {
  switch (filter) {
    case "open":
      return {
        title: "No open conversations",
        description: "New conversations from your widget show up here.",
      };
    case "waiting":
      return {
        title: "Nobody is waiting",
        description:
          "Conversations the agent hands to you show up here and at the top of the list.",
      };
    case "ai":
      return {
        title: "The agent isn't in any conversations",
        description: "Conversations the agent is answering show up here.",
      };
    case "human":
      return {
        title: "You're not in any conversations",
        description: "Take over a conversation or reply to one to see it here.",
      };
    case "closed":
      return {
        title: "No closed conversations",
        description:
          "Conversations you close, or that go quiet for 24 hours, show up here.",
      };
    default: {
      const unhandled: never = filter;
      throw new Error(`Unhandled filter: ${String(unhandled)}`);
    }
  }
}

export function ConversationList({
  selectedId,
  filterValue,
  search,
  onSearchChange,
}: {
  selectedId: string | undefined;
  filterValue: string | null;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  const router = useRouter();
  const conversations = useConversations();
  const now = useNow();
  const filter = parseFilter(filterValue);

  const counts = useMemo(() => countByFilter(conversations), [conversations]);
  const visible = useMemo(
    () =>
      conversations
        .filter(
          (conversation) =>
            matchesFilter(conversation, filter) &&
            matchesSearch(conversation, search),
        )
        .sort(compareConversations),
    [conversations, filter, search],
  );

  function selectFilter(value: unknown) {
    const next = parseFilter(typeof value === "string" ? value : null);
    router.replace(
      inboxRoute({ conversationId: selectedId, state: filterParam(next) }),
      { scroll: false },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <h1 className="font-display text-xl tracking-[-0.04em]">Inbox</h1>
        {counts.waiting > 0 ? (
          <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground tabular-nums">
            {counts.waiting} waiting
          </span>
        ) : null}
        <ConnectionNote />
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-b px-3 pb-3">
        <Tabs value={filter} onValueChange={selectFilter}>
          <TabsList className="h-9! w-full" aria-label="Filter by state">
            {INBOX_FILTERS.map((option) => (
              <TabsTrigger key={option} value={option} className="px-1 text-xs">
                {filterLabel(option)}
                {option === "waiting" && counts.waiting > 0 ? (
                  <span className="tabular-nums">{counts.waiting}</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search visitors and last messages"
            aria-label="Search conversations"
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>
      {conversations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No conversations yet</EmptyTitle>
            <EmptyDescription>
              Add the widget to your site. When a visitor sends a message, the
              conversation shows up here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`${routes.dashboard}#install`} />}
            >
              <CodeXmlIcon data-icon="inline-start" />
              Install the widget
            </Button>
          </EmptyContent>
        </Empty>
      ) : visible.length > 0 ? (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col divide-y">
            {visible.map((conversation) => (
              <li key={conversation.id}>
                <ConversationRow
                  conversation={conversation}
                  href={inboxRoute({
                    conversationId: conversation.id,
                    state: filterParam(filter),
                  })}
                  selected={conversation.id === selectedId}
                  now={now}
                />
              </li>
            ))}
          </ul>
        </ScrollArea>
      ) : search.trim() ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>
              Nothing in {filterLabel(filter)} matches &ldquo;{search.trim()}
              &rdquo;. Try another word or filter.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>{emptyCopy(filter).title}</EmptyTitle>
            <EmptyDescription>{emptyCopy(filter).description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

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

/** Messages that arrive meanwhile are fetched once the connection is back. */
function ConnectionNote() {
  const copy = connectionCopy(useWorkspaceRealtimeStatus());
  if (!copy) return null;
  return (
    <span
      role="status"
      className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none" />
      {copy}
    </span>
  );
}

function ConversationRow({
  conversation,
  href,
  selected,
  now,
}: {
  conversation: ConversationSummary;
  href: string;
  selected: boolean;
  now: number;
}) {
  const preview = conversation.preview
    ? stripMarkdown(conversation.preview)
    : null;
  const waiting = conversation.state === "waiting";

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "relative flex gap-3 px-4 py-3 text-left text-sm transition-colors duration-150 outline-none hover:bg-muted/50 focus-visible:bg-muted",
        selected && "bg-muted hover:bg-muted",
      )}
    >
      <span className="relative mt-0.5 shrink-0 self-start">
        <VisitorAvatar visitorId={conversation.visitor.id} />
        {conversation.unread ? (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand ring-2 ring-card">
            <span className="sr-only">Unread</span>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "truncate",
              conversation.unread || waiting ? "font-semibold" : "font-medium",
            )}
          >
            {visitorLabel(conversation.visitor)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
            {compactAge(conversation.lastMessageAt, now)}
          </span>
        </span>
        {preview ? (
          <span
            className={cn(
              "line-clamp-1 text-[13px] wrap-anywhere",
              conversation.unread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {preview}
          </span>
        ) : null}
        <span className="flex min-w-0 items-center gap-2 pt-0.5">
          <StateBadge state={conversation.state} />
          {waiting && conversation.handoffReason ? (
            <span className="truncate text-xs text-muted-foreground">
              {handoffReasonLabel(conversation.handoffReason)}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
