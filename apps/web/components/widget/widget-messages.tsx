import type { ReactNode } from "react";
import { Streamdown } from "streamdown";
import type { WidgetMessage } from "./types";
import { WidgetAvatar } from "./widget-avatar";

type Sender = { name: string; avatarUrl: string };

function SenderMessage({
  sender,
  showSender,
  children,
}: {
  sender: Sender;
  showSender: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-end gap-2 pr-8">
      {showSender ? (
        <WidgetAvatar name={sender.name} src={sender.avatarUrl} />
      ) : (
        <span className="w-7 shrink-0" aria-hidden />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        {showSender ? (
          <p className="px-1 text-xs text-muted-foreground">{sender.name}</p>
        ) : null}
        <div className="rounded-xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm/relaxed break-words text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function MessageMarkdown({ body }: { body: string }) {
  return (
    <Streamdown
      mode="static"
      controls={false}
      className="space-y-2 [&_ol]:space-y-0.5 [&_ul]:space-y-0.5"
    >
      {body}
    </Streamdown>
  );
}

function VisitorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end pl-12">
      <div className="rounded-xl rounded-br-sm bg-(--widget-accent) px-3.5 py-2 text-sm/relaxed break-words whitespace-pre-wrap text-(--widget-accent-foreground)">
        {children}
      </div>
    </div>
  );
}

function SystemMessage({ children }: { children: ReactNode }) {
  return (
    <p className="mx-4 rounded-lg bg-muted/60 px-3 py-2 text-center text-xs/relaxed text-muted-foreground">
      {children}
    </p>
  );
}

function senderKey(message: WidgetMessage): string | null {
  switch (message.author) {
    case "agent":
      return "agent";
    case "member":
      return `member:${message.member.name}`;
    case "visitor":
    case "system":
      return null;
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}

function MessageItem({
  message,
  agent,
  showSender,
}: {
  message: WidgetMessage;
  agent: Sender;
  showSender: boolean;
}) {
  switch (message.author) {
    case "agent":
      return (
        <SenderMessage sender={agent} showSender={showSender}>
          <MessageMarkdown body={message.body} />
        </SenderMessage>
      );
    case "member":
      return (
        <SenderMessage sender={message.member} showSender={showSender}>
          <MessageMarkdown body={message.body} />
        </SenderMessage>
      );
    case "visitor":
      return <VisitorMessage>{message.body}</VisitorMessage>;
    case "system":
      return <SystemMessage>{message.body}</SystemMessage>;
    default: {
      const unreachable: never = message;
      return unreachable;
    }
  }
}

/**
 * Renders the conversation, after the greeting when one is given. The greeting
 * is shown with the agent's name and avatar even while the agent is off.
 */
export function WidgetMessages({
  agentName,
  agentAvatarUrl,
  greeting,
  messages,
}: {
  agentName: string;
  agentAvatarUrl: string;
  greeting: string | null;
  messages: readonly WidgetMessage[];
}) {
  const agent: Sender = { name: agentName, avatarUrl: agentAvatarUrl };
  const all: readonly WidgetMessage[] =
    greeting === null
      ? messages
      : [{ id: "greeting", author: "agent", body: greeting }, ...messages];

  return (
    <ol className="flex flex-col gap-3">
      {all.map((message, index) => {
        const previous = all[index - 1];
        const key = senderKey(message);
        const showSender =
          key !== null && (!previous || senderKey(previous) !== key);

        return (
          <li key={message.id}>
            <MessageItem
              message={message}
              agent={agent}
              showSender={showSender}
            />
          </li>
        );
      })}
    </ol>
  );
}
