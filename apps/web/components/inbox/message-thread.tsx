"use client";

import {
  ArrowLeftRightIcon,
  BanIcon,
  CircleCheckIcon,
  ImageIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { useInboxStore } from "@/components/inbox/inbox-store";
import {
  AgentAvatar,
  MemberAvatar,
  useOwner,
  VisitorAvatar,
} from "@/components/inbox/participant-avatar";
import { RelativeTime } from "@/components/inbox/relative-time";
import { systemEventLabel, visitorLabel } from "@/lib/inbox/format";
import type {
  AgentMessage,
  Attachment,
  Conversation,
  MemberMessage,
  SystemEvent,
  SystemMessage,
  VisitorMessage,
} from "@/lib/inbox/types";
import { cn } from "@/lib/utils";

type SpokenMessage = VisitorMessage | AgentMessage | MemberMessage;

type ThreadItem =
  | { kind: "event"; message: SystemMessage }
  | {
      kind: "group";
      author: SpokenMessage["author"];
      messages: SpokenMessage[];
    };

const GROUP_GAP_MS = 5 * 60_000;

function groupMessages(conversation: Conversation): ThreadItem[] {
  const items: ThreadItem[] = [];
  for (const message of conversation.messages) {
    if (message.author === "system") {
      items.push({ kind: "event", message });
      continue;
    }
    const previous = items.at(-1);
    const previousMessage =
      previous?.kind === "group" ? previous.messages.at(-1) : undefined;
    if (
      previous?.kind === "group" &&
      previous.author === message.author &&
      previousMessage &&
      Date.parse(message.createdAt) - Date.parse(previousMessage.createdAt) <
        GROUP_GAP_MS
    ) {
      previous.messages.push(message);
    } else {
      items.push({
        kind: "group",
        author: message.author,
        messages: [message],
      });
    }
  }
  return items;
}

export function MessageThread({
  conversation,
}: {
  conversation: Conversation;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const items = groupMessages(conversation);
  const count = conversation.messages.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.id, count]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 lg:px-6">
      {items.map((item) => (
        <Fragment
          key={item.kind === "event" ? item.message.id : item.messages[0]?.id}
        >
          {item.kind === "event" ? (
            <EventItem message={item.message} />
          ) : (
            <MessageGroup conversation={conversation} item={item} />
          )}
        </Fragment>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function eventIcon(event: SystemEvent): ReactNode {
  switch (event.kind) {
    case "greeting":
      return null;
    case "handoff":
      return <ArrowLeftRightIcon className="size-3.5" aria-hidden />;
    case "taken_over":
      return <UserRoundCheckIcon className="size-3.5" aria-hidden />;
    case "handed_back":
      return <ArrowLeftRightIcon className="size-3.5" aria-hidden />;
    case "closed":
      return <CircleCheckIcon className="size-3.5" aria-hidden />;
    default: {
      const unhandled: never = event;
      throw new Error(`Unhandled event: ${JSON.stringify(unhandled)}`);
    }
  }
}

function EventItem({ message }: { message: SystemMessage }) {
  const { event } = message;
  if (event.kind === "greeting") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="px-1 text-xs text-muted-foreground">Greeting</p>
        <div className="max-w-[85%] rounded-xl border border-dashed px-3.5 py-2 text-sm text-muted-foreground">
          {event.body}
        </div>
      </div>
    );
  }

  return (
    <div
      role="note"
      className={cn(
        "flex items-center gap-3 text-xs",
        event.kind === "handoff"
          ? "font-medium text-foreground"
          : "text-muted-foreground",
      )}
    >
      <span className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1.5 text-center text-balance">
        {eventIcon(event)}
        <span>
          {systemEventLabel(event)}
          <span className="font-normal text-muted-foreground">
            {" · "}
            <RelativeTime iso={message.createdAt} />
          </span>
        </span>
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function MessageGroup({
  conversation,
  item,
}: {
  conversation: Conversation;
  item: Extract<ThreadItem, { kind: "group" }>;
}) {
  const { agent } = useInboxStore();
  const owner = useOwner();
  const fromVisitor = item.author === "visitor";
  const first = item.messages[0];
  if (!first) {
    return null;
  }

  let name: string;
  let avatar: ReactNode;
  switch (item.author) {
    case "visitor":
      name = visitorLabel(conversation.visitor);
      avatar = <VisitorAvatar visitorId={conversation.visitor.id} />;
      break;
    case "agent":
      name = agent.name;
      avatar = <AgentAvatar />;
      break;
    case "member":
      name = `${owner.name} (you)`;
      avatar = <MemberAvatar />;
      break;
    default: {
      const unhandled: never = item.author;
      throw new Error(`Unhandled author: ${String(unhandled)}`);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        fromVisitor ? "flex-row" : "flex-row-reverse",
      )}
    >
      <div className="shrink-0 pt-5">{avatar}</div>
      <div
        className={cn(
          "flex max-w-[85%] min-w-0 flex-col gap-1",
          fromVisitor ? "items-start" : "items-end",
        )}
      >
        <p
          className={cn(
            "flex items-baseline gap-1.5 px-1 text-xs",
            !fromVisitor && "flex-row-reverse",
          )}
        >
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground">
            <RelativeTime iso={first.createdAt} />
          </span>
        </p>
        {item.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: SpokenMessage }) {
  switch (message.author) {
    case "visitor":
      return (
        <>
          {message.body ? (
            <div className="rounded-xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm break-words whitespace-pre-wrap">
              {message.body}
            </div>
          ) : null}
          <Attachments attachments={message.attachments} />
          {message.declined ? (
            <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <BanIcon className="size-3.5" aria-hidden />
              Declined as off-topic. The agent didn&apos;t search the knowledge
              base.
            </p>
          ) : null}
        </>
      );
    case "agent":
      return (
        <div className="rounded-xl rounded-tr-sm bg-card px-3.5 py-2 text-sm shadow-soft ring-1 ring-foreground/10">
          <MessageMarkdown body={message.body} />
        </div>
      );
    case "member":
      return (
        <>
          {message.body ? (
            <div className="rounded-xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground [&_a]:text-primary-foreground [&_code]:bg-primary-foreground/15 [&_code]:text-primary-foreground">
              <MessageMarkdown body={message.body} />
            </div>
          ) : null}
          <Attachments attachments={message.attachments} />
        </>
      );
    default: {
      const unhandled: never = message;
      throw new Error(`Unhandled message: ${JSON.stringify(unhandled)}`);
    }
  }
}

function MessageMarkdown({ body }: { body: string }) {
  return (
    <Streamdown
      mode="static"
      controls={false}
      className="space-y-2 break-words [&_ol]:space-y-0.5 [&_ul]:space-y-0.5"
    >
      {body}
    </Streamdown>
  );
}

const sizeFormat = new Intl.NumberFormat("en", {
  style: "unit",
  unit: "kilobyte",
  unitDisplay: "short",
  maximumFractionDigits: 0,
});

function Attachments({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <li
          key={attachment.storageKey}
          className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs ring-1 ring-foreground/10"
        >
          <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          <span className="font-medium">{attachment.name}</span>
          <span className="text-muted-foreground">
            {sizeFormat.format(attachment.size / 1024)}
          </span>
        </li>
      ))}
    </ul>
  );
}
