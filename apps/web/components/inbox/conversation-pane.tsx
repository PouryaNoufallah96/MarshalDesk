"use client";

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
import { type ReactElement, type ReactNode, useEffect } from "react";
import { Composer } from "@/components/inbox/composer";
import { useInboxStore } from "@/components/inbox/inbox-store";
import { MessageThread } from "@/components/inbox/message-thread";
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
import { canApply, type MemberActionType } from "@/lib/inbox/transitions";
import type { Conversation } from "@/lib/inbox/types";

type DetailsControl = {
  open: boolean;
  toggle: () => void;
};

function ToolbarButton({
  label,
  tooltip,
  icon,
  onClick,
  variant = "outline",
}: {
  label: string;
  tooltip: string;
  icon: ReactElement;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant={variant} size="sm" onClick={onClick} />}
      >
        {icon}
        <span className="sr-only @lg:not-sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Actions({ conversation }: { conversation: Conversation }) {
  const { act } = useInboxStore();
  const run = (type: Exclude<MemberActionType, "reply">) =>
    act(conversation.id, { type });

  return (
    <div className="flex items-center gap-1.5">
      {canApply(conversation, "take_over") ? (
        <ToolbarButton
          label="Take over"
          tooltip="Reply yourself. The agent stops replying in this conversation."
          icon={<UserRoundCheckIcon />}
          variant={conversation.state === "waiting" ? "default" : "outline"}
          onClick={() => run("take_over")}
        />
      ) : null}
      {canApply(conversation, "hand_to_agent") ? (
        <ToolbarButton
          label="Hand to agent"
          tooltip="The agent answers the visitor's next message. It can see what you wrote."
          icon={<BotIcon />}
          onClick={() => run("hand_to_agent")}
        />
      ) : null}
      {canApply(conversation, "close") ? (
        <ToolbarButton
          label="Close"
          tooltip="End this conversation. A new message from the visitor starts a new one."
          icon={<CircleCheckIcon />}
          onClick={() => run("close")}
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

export function ConversationPane({
  conversation,
  requestedId,
  backHref,
  details,
}: {
  conversation: Conversation | null;
  requestedId: string | undefined;
  /** Shown on narrow screens, where the list and the conversation don't fit side by side. */
  backHref?: string;
  details: DetailsControl;
}) {
  const { markRead, now } = useInboxStore();
  const conversationId = conversation?.id;
  const unread = conversation?.unread ?? false;

  useEffect(() => {
    if (conversationId && unread) {
      markRead(conversationId);
    }
  }, [conversationId, unread, markRead]);

  if (!conversation) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PaneHeader>
          {backHref ? <BackButton href={backHref} /> : null}
          <div className="ml-auto">
            <DetailsToggle details={details} />
          </div>
        </PaneHeader>
        {requestedId ? (
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
            {locationLabel(visitorDetails)} ·{" "}
            {visitorLocalTime(visitorDetails.timezone, now)} local time
          </p>
        </div>
        <Actions conversation={conversation} />
        <Separator orientation="vertical" className="mx-1 h-5 self-center" />
        <DetailsToggle details={details} />
      </PaneHeader>
      <ScrollArea className="min-h-0 flex-1">
        <MessageThread conversation={conversation} />
      </ScrollArea>
      <Composer key={conversation.id} conversation={conversation} />
    </div>
  );
}
