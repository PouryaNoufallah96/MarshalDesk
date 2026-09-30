"use client";

import { SUGGESTED_QUESTIONS_MAX } from "@marshaldesk/shared";
import { BookOpenIcon, UserRoundIcon } from "lucide-react";
import { type CSSProperties, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { WidgetAppearance, WidgetMessage } from "./types";
import { WidgetComposer } from "./widget-composer";
import { WidgetHeader } from "./widget-header";
import { WidgetMessages } from "./widget-messages";
import { widgetThemeStyle } from "./widget-theme";

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
          <button
            type="button"
            onClick={() => onSelect?.(question)}
            className="rounded-lg border border-(--widget-accent)/40 bg-background px-3 py-1.5 text-left text-[13px] leading-snug text-foreground transition-colors outline-none hover:border-(--widget-accent) hover:bg-(--widget-accent)/8 focus-visible:ring-2 focus-visible:ring-(--widget-accent)/50"
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
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
  notice,
  onClose,
  onSelectQuestion,
  onTalkToHuman,
  onSend,
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
  notice?: string | null;
  onClose?: () => void;
  onSelectQuestion?: (question: string) => void;
  onTalkToHuman?: () => void;
  onSend?: (body: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const hasVisitorMessage = messages.some(
    (message) => message.author === "visitor",
  );
  const suggestionsShown =
    showSuggestedQuestions ?? (appearance.agentEnabled && !hasVisitorMessage);
  const talkToHumanShown = showTalkToHuman ?? appearance.agentEnabled;

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lastMessageId, notice]);

  return (
    <section
      aria-label={`Chat with ${appearance.agentName}`}
      style={{ ...widgetThemeStyle(appearance.color), ...style }}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 shadow-black/15 ring-foreground/10 dark:shadow-black/50",
        className,
      )}
    >
      <WidgetHeader
        agentName={appearance.agentName}
        agentAvatarUrl={appearance.agentAvatarUrl}
        status={
          appearance.agentEnabled
            ? "Replies right away"
            : "A person will reply soon"
        }
        onClose={onClose}
      />
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {suggestionsShown ? (
          <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-ink-line bg-ink px-3 py-1 text-[11px] text-ink-muted">
            <BookOpenIcon className="size-3" aria-hidden />
            Answers only from our knowledge base
          </p>
        ) : null}
        <WidgetMessages
          agentName={appearance.agentName}
          agentAvatarUrl={appearance.agentAvatarUrl}
          greeting={showGreeting ? appearance.greeting : null}
          messages={messages}
        />
        {suggestionsShown ? (
          <SuggestedQuestions
            questions={appearance.suggestedQuestions}
            onSelect={onSelectQuestion}
          />
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t px-3 pt-2 pb-3">
        {notice ? (
          <p
            role="status"
            className="px-1 text-center text-xs text-destructive"
          >
            {notice}
          </p>
        ) : null}
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
        <WidgetComposer onSend={onSend} />
      </div>
    </section>
  );
}
