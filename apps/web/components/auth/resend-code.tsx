"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { authErrorMessage, classifyAuthError } from "./auth-error";
import { useCooldown } from "./use-cooldown";

const RESEND_COOLDOWN_SECONDS = 60;

type Status =
  { kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string };

/** Resend link with a cooldown that starts on mount, since a code was just sent. */
export function ResendCode({
  onResend,
}: {
  /** Sends a new code and resolves to the error, or null on success. */
  onResend: () => Promise<unknown>;
}) {
  const { remaining, restart } = useCooldown(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inFlight = useRef(false);

  async function resend() {
    if (inFlight.current || remaining > 0) return;
    inFlight.current = true;
    setSending(true);
    const error = await onResend();
    inFlight.current = false;
    setSending(false);
    if (error) {
      setStatus({ kind: "error", message: authErrorMessage(error) });
      if (classifyAuthError(error) === "rate-limited") restart();
      return;
    }
    setStatus({ kind: "sent" });
    restart();
  }

  const waiting = remaining > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <FieldDescription className="text-center">
        Didn&apos;t get it?{" "}
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm font-normal text-foreground tabular-nums underline disabled:opacity-60"
          disabled={waiting || sending}
          onClick={resend}
        >
          {sending
            ? "Sending…"
            : waiting
              ? `Resend code in ${remaining}s`
              : "Resend code"}
        </Button>
      </FieldDescription>
      <p aria-live="polite" className="text-center text-sm">
        {status.kind === "sent" ? (
          <span className="text-muted-foreground">We sent a new code.</span>
        ) : status.kind === "error" ? (
          <span className="text-destructive">{status.message}</span>
        ) : null}
      </p>
    </div>
  );
}
