"use client";

import { SUGGESTED_QUESTIONS_MAX } from "@marshaldesk/shared";
import { BookOpenIcon, RotateCwIcon, UserRoundIcon } from "lucide-react";
import { type CSSProperties, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WidgetAppearance, WidgetMember, WidgetMessage } from "./types";
import { WidgetComposer } from "./widget-composer";
import { WidgetHeader } from "./widget-header";
import { WidgetMessages, WidgetTyping } from "./widget-messages";
import { widgetThemeStyle } from "./widget-theme";

/** How close to the end counts as reading the latest messages. */
const STICK_TO_END_PX = 64;

function SuggestedQuestions({
  questions,
  onSelect,
}: {
  questions: readonly string[];
  onSelect?: (question: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <ul
      aria-label="Suggested questions"
      className="flex flex-wrap justify-end gap-2 pl-9"
    >
      {questions.slice(0, SUGGESTED_QUESTIONS_MAX).map((question) => (
        <li key={question}>
          <Badge
            variant="secondary"
            render={
              <button type="button" onClick={() => onSelect?.(question)} />
            }
            className="h-auto cursor-pointer px-3 py-1.5 text-left text-[13px] leading-snug whitespace-normal hover:bg-secondary/80"
          >
            {question}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function LoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="m-auto flex flex-col items-center gap-2 px-6 text-center">
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load your conversation.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <RotateCwIcon className="size-3.5" aria-hidden />
        Retry
      </button>
    </div>
  );
}

/**
 * The widget's chat window. Purely presentational: the iframe route and the
 * dashboard preview both render it from plain props.
 */
export function WidgetWindow({
  appearance,
  messages,
  showGreeting = true,
  showSuggestedQuestions,
  showTalkToHuman,
  status,
  notice,
  connection = null,
  loadError = null,
  typing = null,
  autoFocus = false,
  onClose,
  onSelectQuestion,
  onTalkToHuman,
  onSend,
  onTyping,
  preview = false,
  className,
  style,
}: {
  appearance: WidgetAppearance;
  messages: readonly WidgetMessage[];
  /** Show `appearance.greeting` before the messages. */
  showGreeting?: boolean;
  /** Defaults to: agent on and no visitor message yet. */
  showSuggestedQuestions?: boolean;
  /** Defaults to whether the agent is on. */
  showTalkToHuman?: boolean;
  /** The header's status line; `null` hides it. Defaults to one based on the agent. */
  status?: string | null;
  notice?: string | null;
  /** Shown while the live connection is down, e.g. "Reconnecting…". */
  connection?: string | null;
  /** Replaces the conversation when it couldn't be loaded. */
  loadError?: { onRetry: () => void } | null;
  /** Shown while a member types; `sender` is null until one has replied. */
  typing?: { sender: WidgetMember | null } | null;
  /** Focus the message field when the window opens. */
  autoFocus?: boolean;
  onClose?: () => void;
  onSelectQuestion?: (question: string) => void;
  onTalkToHuman?: () => void;
  /** Resolves to `false` when the message wasn't sent, to put it back. */
  onSend?: (body: string) => Promise<boolean> | void;
  onTyping?: (typing: boolean) => void;
  /** The dashboard preview: the thread still scrolls, but no control takes focus or clicks. */
  preview?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const hasVisitorMessage = messages.some(
    (message) => message.author === "visitor",
  );
  const suggestionsShown =
    !loadError &&
    (showSuggestedQuestions ?? (appearance.agentEnabled && !hasVisitorMessage));
  const talkToHumanShown =
    !loadError && (showTalkToHuman ?? appearance.agentEnabled);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToEnd = useRef(true);
  const lastMessage = messages.at(-1);
  const lastMessageId = lastMessage?.id;
  const ownMessageLast = lastMessage?.author === "visitor";
  const typingShown = typing !== null;
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !(stickToEnd.current || ownMessageLast)) return;
    element.scrollTop = element.scrollHeight;
  }, [lastMessageId, ownMessageLast, notice, typingShown]);

  return (
    <section
      aria-label={`Chat with ${appearance.agentName}`}
      style={{ ...widgetThemeStyle(appearance.color), ...style }}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 shadow-black/15 ring-foreground/10 dark:shadow-black/50",
        className,
      )}
    >
      <div inert={preview} className="contents">
        <WidgetHeader
          agentName={appearance.agentName}
          agentAvatarUrl={appearance.agentAvatarUrl}
          status={
            status !== undefined
              ? status
              : appearance.agentEnabled
                ? "Replies right away"
                : "A person will reply soon"
          }
          onClose={onClose}
        />
      </div>
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToEnd.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            STICK_TO_END_PX;
        }}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {loadError ? (
          <LoadError onRetry={loadError.onRetry} />
        ) : (
          <>
            {preview && suggestionsShown ? (
              <Badge variant="secondary" className="mx-auto">
                <BookOpenIcon aria-hidden />
                Answers only from your knowledge base
              </Badge>
            ) : null}
            <div role="log" aria-live="polite" aria-label="Messages">
              <WidgetMessages
                agentName={appearance.agentName}
                agentAvatarUrl={appearance.agentAvatarUrl}
                greeting={showGreeting ? appearance.greeting : null}
                messages={messages}
              />
            </div>
          </>
        )}
        <div aria-live="polite" className="empty:-mt-3">
          {typing ? <WidgetTyping sender={typing.sender} /> : null}
        </div>
        {suggestionsShown ? (
          <div inert={preview} className="contents">
            <SuggestedQuestions
              questions={appearance.suggestedQuestions}
              onSelect={onSelectQuestion}
            />
          </div>
        ) : null}
      </div>
      <div
        inert={preview}
        className="flex shrink-0 flex-col gap-2 border-t px-3 pt-2 pb-3"
      >
        <p
          role="status"
          className="flex items-center justify-center gap-1.5 px-1 text-xs text-muted-foreground empty:-mt-2"
        >
          {connection}
        </p>
        <p
          role="status"
          className="px-1 text-center text-xs text-destructive empty:-mt-2"
        >
          {notice}
        </p>
        {talkToHumanShown ? (
          <button
            type="button"
            onClick={onTalkToHuman}
            className="mx-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <UserRoundIcon className="size-3.5" aria-hidden />
            Talk to a human
          </button>
        ) : null}
        <WidgetComposer
          onSend={onSend}
          onTyping={onTyping}
          autoFocus={autoFocus}
        />
      </div>
    </section>
  );
}
