"use client";

import { MESSAGE_MAX_LENGTH, messageBodySchema } from "@marshaldesk/shared";
import { ArrowUpIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";

export function WidgetComposer({
  onSend,
}: {
  onSend?: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tooLong = body.trim().length > MESSAGE_MAX_LENGTH;
  const canSend = body.trim().length > 0 && !tooLong;
  const shownError = tooLong
    ? messageBodySchema.safeParse(body).error?.issues[0]?.message
    : error;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = messageBodySchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    onSend?.(parsed.data);
    setBody("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form
        onSubmit={submit}
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-background py-1 pr-1 pl-3.5 transition-colors focus-within:border-foreground/30 dark:bg-input/30",
          shownError && "border-destructive focus-within:border-destructive",
        )}
      >
        <label htmlFor="widget-message" className="sr-only">
          Message
        </label>
        <input
          id="widget-message"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError(null);
          }}
          placeholder="Write a message…"
          autoComplete="off"
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? "widget-message-error" : undefined}
          className="h-8 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--widget-accent) text-(--widget-accent-foreground) transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-(--widget-accent)/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40"
        >
          <ArrowUpIcon className="size-4" aria-hidden />
        </button>
      </form>
      {shownError ? (
        <p
          id="widget-message-error"
          role="alert"
          className="px-1 text-xs text-destructive"
        >
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
