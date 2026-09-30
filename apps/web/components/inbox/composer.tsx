"use client";

import {
  type ConversationState,
  type ConversationSummary,
  MESSAGE_MAX_LENGTH,
  nextState,
} from "@marshaldesk/shared";
import { SendHorizontalIcon } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { useHydrated } from "@/components/inbox/use-hydrated";
import { useConversationActions } from "@/components/inbox/use-inbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
function hintFor(state: ConversationState): string {
  switch (state) {
    case "ai":
      return "Sending a reply takes over from the agent.";
    case "waiting":
      return "Sending a reply takes over this conversation.";
    case "human":
      return "The agent stays out of this conversation until you hand it back.";
    case "closed":
      return "This conversation is closed. The visitor can start a new one from the widget.";
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

function useIsApple(): boolean {
  const hydrated = useHydrated();
  return hydrated && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function Composer({
  conversation,
  onTyping,
}: {
  conversation: ConversationSummary;
  onTyping?: (typing: boolean) => void;
}) {
  const { reply } = useConversationActions(conversation.id);
  const [draft, setDraft] = useState("");
  const isApple = useIsApple();
  const closed = nextState(conversation.state, "reply") === null;
  const canSend = !closed && !reply.isPending && draft.trim().length > 0;

  function send() {
    if (!canSend) return;
    onTyping?.(false);
    reply.mutate(
      { id: conversation.id, body: draft },
      { onSuccess: () => setDraft("") },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      send();
    }
  }

  return (
    <form onSubmit={onSubmit} className="shrink-0 p-3 lg:px-4 lg:pb-4">
      <InputGroup className="mx-auto max-w-3xl rounded-xl bg-card shadow-soft">
        <InputGroupTextarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping?.(event.target.value.trim().length > 0);
          }}
          onBlur={() => onTyping?.(false)}
          onKeyDown={onKeyDown}
          disabled={closed}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={
            closed ? "This conversation is closed" : "Reply to the visitor…"
          }
          aria-label="Reply"
          className="max-h-48 min-h-20"
        />
        <InputGroupAddon align="block-end" className="gap-3">
          <p className="min-w-0 flex-1 text-left text-xs font-normal text-muted-foreground">
            {hintFor(conversation.state)}
          </p>
          {closed ? null : (
            <>
              <kbd className="hidden shrink-0 font-sans text-xs font-normal text-muted-foreground sm:inline">
                {isApple ? "⌘ Enter" : "Ctrl Enter"}
              </kbd>
              <InputGroupButton
                type="submit"
                variant="default"
                size="sm"
                disabled={!canSend}
                className="shrink-0"
              >
                Send
                <SendHorizontalIcon data-icon="inline-end" />
              </InputGroupButton>
            </>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
