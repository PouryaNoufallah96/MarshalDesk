"use client";

import type { ClientMessage } from "@marshaldesk/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const SEND_EVERY_MS = 2_000;
/** Longer than `SEND_EVERY_MS`, so a steady typist never flickers. */
const EXPIRE_AFTER_MS = 5_000;

/**
 * Tells the room while someone types: `true` at most every 2 s while typing,
 * `false` once when they stop, send, or leave the field.
 */
export function useTypingSignal(send: (message: ClientMessage) => void) {
  const lastSentAt = useRef(0);
  const typing = useRef(false);

  const stop = useCallback(() => {
    if (!typing.current) return;
    typing.current = false;
    lastSentAt.current = 0;
    send({ type: "typing", typing: false });
  }, [send]);

  const update = useCallback(
    (active: boolean) => {
      if (!active) {
        stop();
        return;
      }
      const now = Date.now();
      if (typing.current && now - lastSentAt.current < SEND_EVERY_MS) return;
      typing.current = true;
      lastSentAt.current = now;
      send({ type: "typing", typing: true });
    },
    [send, stop],
  );

  useEffect(() => stop, [stop]);

  return update;
}

/** Whether the other side is typing. Clears itself if updates stop arriving. */
export function useRemoteTyping(resetKey: string | null | undefined) {
  const [typing, setTyping] = useState<{
    key: string | null | undefined;
    active: boolean;
  }>({ key: resetKey, active: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const receive = useCallback(
    (active: boolean) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = active
        ? setTimeout(
            () => setTyping({ key: resetKey, active: false }),
            EXPIRE_AFTER_MS,
          )
        : null;
      setTyping({ key: resetKey, active });
    },
    [resetKey],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return {
    typing: typing.key === resetKey && typing.active,
    receive,
  };
}
