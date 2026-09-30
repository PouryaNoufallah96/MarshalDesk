"use client";

import {
  type ConversationDetail,
  type ConversationSummary,
  nextState,
} from "@marshaldesk/shared";
import {
  ArrowLeftIcon,
  BotIcon,
  CircleCheckIcon,
  MessagesSquareIcon,
  PanelRightIcon,
  SearchXIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { Composer } from "@/components/inbox/composer";
import { useNow } from "@/components/inbox/inbox-clock";
import {
  useConversationActions,
  useMarkRead,
} from "@/components/inbox/use-inbox";
import { MessageThread } from "@/components/inbox/message-thread";
import { useConversationRoom } from "@/components/inbox/use-conversation-room";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  locationLabel,
  visitorLabel,
  visitorLocalTime,
} from "@/lib/inbox/format";

type DetailsControl = {
  open: boolean;
  toggle: () => void;
};

function ToolbarButton({
  label,
  tooltip,
  icon,
  onClick,
  disabled,
  variant = "outline",
}: {
  label: string;
  tooltip: string;
  icon: ReactElement;
  onClick: () => void;
  disabled: boolean;
  variant?: "default" | "outline";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size="sm"
            onClick={onClick}
            disabled={disabled}
          />
        }
      >
        {icon}
        <span className="sr-only @lg:not-sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Actions({ conversation }: { conversation: ConversationSummary }) {
  const { id, state } = conversation;
  const { takeOver, handBack, close, pending } = useConversationActions(id);

  return (
    <div className="flex items-center gap-1.5">
      {nextState(state, "take_over") ? (
        <ToolbarButton
          label="Take over"
          tooltip="Reply yourself. The agent stops replying in this conversation."
          icon={<UserRoundCheckIcon />}
          variant={state === "waiting" ? "default" : "outline"}
          disabled={pending}
          onClick={() => takeOver.mutate({ id })}
        />
      ) : null}
      {nextState(state, "hand_back") ? (
        <ToolbarButton
          label="Hand to agent"
          tooltip="The agent answers the visitor's next message. It can see what you wrote."
          icon={<BotIcon />}
          disabled={pending}
          onClick={() => handBack.mutate({ id })}
        />
      ) : null}
      {nextState(state, "close") ? (
        <ToolbarButton
          label="Close"
          tooltip="End this conversation. A new message from the visitor starts a new one."
          icon={<CircleCheckIcon />}
          disabled={pending}
          onClick={() => close.mutate({ id })}
        />
      ) : null}
    </div>
  );
}

function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className="@container flex h-14 shrink-0 items-center gap-2 border-b px-3 lg:px-4">
      {children}
    </div>
  );
}

function DetailsToggle({ details }: { details: DetailsControl }) {
  const label = details.open ? "Hide details" : "Show details";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={details.toggle}
            aria-label={label}
            aria-pressed={details.open}
          />
        }
      >
        <PanelRightIcon />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function BackButton({ href }: { href: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      nativeButton={false}
      render={<Link href={href} scroll={false} />}
      aria-label="Back to conversations"
    >
      <ArrowLeftIcon />
    </Button>
  );
}

function ThreadSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 lg:px-6"
      aria-busy
      aria-label="Loading messages"
    >
      <Skeleton className="h-10 w-2/3 rounded-xl" />
      <Skeleton className="ml-auto h-16 w-3/4 rounded-xl" />
      <Skeleton className="h-10 w-1/2 rounded-xl" />
    </div>
  );
}

export function ConversationPane({
  conversation,
  detail,
  loading,
  requestedId,
  backHref,
  details,
}: {
  conversation: ConversationSummary | null;
  /** The messages; missing while they load. */
  detail: ConversationDetail | undefined;
  loading: boolean;
  requestedId: string | undefined;
  /** Shown on narrow screens, where the list and the conversation don't fit side by side. */
  backHref?: string;
  details: DetailsControl;
}) {
  const now = useNow();
  useMarkRead(conversation);
  const room = useConversationRoom(conversation?.id);

  if (!conversation) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PaneHeader>
          {backHref ? <BackButton href={backHref} /> : null}
          <div className="ml-auto">
            <DetailsToggle details={details} />
          </div>
        </PaneHeader>
        {requestedId && loading ? (
          <ThreadSkeleton />
        ) : requestedId ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>Conversation not found</EmptyTitle>
              <EmptyDescription>
                It may have been removed, or the link is wrong.
              </EmptyDescription>
            </EmptyHeader>
            {backHref ? (
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={backHref} />}
                >
                  Back to conversations
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessagesSquareIcon />
              </EmptyMedia>
              <EmptyTitle>No conversation selected</EmptyTitle>
              <EmptyDescription>
                Pick a conversation from the list to read it and reply.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    );
  }

  const { details: visitorDetails } = conversation.visitor;
  const localTime = visitorLocalTime(visitorDetails.timezone, now);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PaneHeader>
        {backHref ? <BackButton href={backHref} /> : null}
        <VisitorAvatar visitorId={conversation.visitor.id} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-[-0.01em]">
              {visitorLabel(conversation.visitor)}
            </h2>
            <StateBadge state={conversation.state} />
          </div>
          <p className="hidden truncate text-xs text-muted-foreground @md:block">
            {locationLabel(visitorDetails)}
            {localTime ? ` · ${localTime} local time` : null}
          </p>
        </div>
        <Actions conversation={conversation} />
        <Separator orientation="vertical" className="mx-1 h-5 self-center" />
        <DetailsToggle details={details} />
      </PaneHeader>
      <ScrollArea className="min-h-0 flex-1">
        {detail ? (
          <MessageThread
            conversation={detail}
            visitorTyping={room.visitorTyping}
          />
        ) : (
          <ThreadSkeleton />
        )}
      </ScrollArea>
      <Composer
        key={conversation.id}
        conversation={conversation}
        onTyping={room.setTyping}
      />
    </div>
  );
}
