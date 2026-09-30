"use client";

import { SendHorizontalIcon } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { useInboxStore } from "@/components/inbox/inbox-store";
import { useOwner } from "@/components/inbox/participant-avatar";
import { useHydrated } from "@/components/inbox/use-hydrated";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import type { Conversation } from "@/lib/inbox/types";

function hintFor(state: Conversation["state"]): string {
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

export function Composer({ conversation }: { conversation: Conversation }) {
  const { act } = useInboxStore();
  const owner = useOwner();
  const [draft, setDraft] = useState("");
  const isApple = useIsApple();
  const closed = conversation.state === "closed";
  const canSend = !closed && draft.trim().length > 0;

  function send() {
    if (!canSend) return;
    act(conversation.id, { type: "reply", body: draft, memberId: owner.id });
    setDraft("");
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
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={closed}
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
