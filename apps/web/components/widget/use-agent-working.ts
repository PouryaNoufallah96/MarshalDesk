"use client";

import type { Conversation, Message } from "@marshaldesk/shared";
import { useEffect, useState } from "react";

/** Past this, the agent has most likely failed or handed off without a word. */
const AGENT_WORKING_MAX_MS = 45_000;

/**
 * Whether the agent is working on a reply it hasn't started streaming: the
 * conversation is with the agent and the visitor spoke last, for up to 45 s.
 */
export function useAgentWorking(
  conversation: Conversation | null,
  messages: readonly Message[],
  streaming: boolean,
): boolean {
  const last = messages.at(-1);
  const waitingFor =
    conversation?.state === "ai" && last?.author === "visitor" ? last : null;
  const [expiredId, setExpiredId] = useState<string | null>(null);

  const waitingId = waitingFor?.id ?? null;
  const waitingSince = waitingFor?.createdAt ?? null;
  useEffect(() => {
    if (!waitingId || !waitingSince) return;
    // The server's clock may be ahead of this one, so never wait from later than now.
    const since = Math.min(Date.parse(waitingSince), Date.now());
    const remaining = since + AGENT_WORKING_MAX_MS - Date.now();
    const timer = setTimeout(
      () => setExpiredId(waitingId),
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [waitingId, waitingSince]);

  return waitingId !== null && expiredId !== waitingId && !streaming;
}
