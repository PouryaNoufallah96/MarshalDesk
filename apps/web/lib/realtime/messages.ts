import type { Message } from "@marshaldesk/shared";

/** Adds messages that aren't there yet, keeping oldest-first order. */
export function mergeMessages(
  current: readonly Message[],
  incoming: readonly Message[],
): Message[] {
  const known = new Set(current.map((message) => message.id));
  const added = incoming.filter((message) => !known.has(message.id));
  if (added.length === 0) return [...current];
  return [...current, ...added].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export function laterIso(a: string, b: string): string {
  return Date.parse(b) > Date.parse(a) ? b : a;
}
