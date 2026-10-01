import type { Message } from "@marshaldesk/shared";

const FRACTION = /\.(\d+)/;

/**
 * Microseconds since the epoch. The server orders writes to the microsecond
 * and trims trailing zeros, so neither `Date.parse` nor string order works.
 */
function micros(iso: string): number {
  const fraction = FRACTION.exec(iso)?.[1] ?? "";
  const whole = Date.parse(iso.replace(FRACTION, ""));
  return whole * 1000 + Number(fraction.padEnd(6, "0").slice(0, 6));
}

export function compareIso(a: string, b: string): number {
  return micros(a) - micros(b);
}

/** Every message from both lists once, oldest first. Ties keep their order. */
export function mergeMessages(
  current: readonly Message[],
  incoming: readonly Message[],
): Message[] {
  const known = new Set(current.map((message) => message.id));
  const added = incoming.filter((message) => !known.has(message.id));
  if (added.length === 0) return [...current];
  return [...current, ...added].sort((a, b) =>
    compareIso(a.createdAt, b.createdAt),
  );
}

export function laterIso(a: string, b: string): string {
  return compareIso(b, a) > 0 ? b : a;
}

/** Whether `candidate` is an older version of the same conversation than `current`. */
export function isOlder(
  candidate: { updatedAt: string },
  current: { updatedAt: string },
): boolean {
  return compareIso(candidate.updatedAt, current.updatedAt) < 0;
}
