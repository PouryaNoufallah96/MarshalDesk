"use client";

import { ArrowUpIcon } from "lucide-react";
import { type FormEvent, useState } from "react";

export function WidgetComposer({
  onSend,
}: {
  onSend?: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  const canSend = body.trim().length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    onSend?.(body.trim());
    setBody("");
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-xl border bg-background py-1 pr-1 pl-3.5 transition-colors focus-within:border-foreground/30 dark:bg-input/30"
    >
      <label htmlFor="widget-message" className="sr-only">
        Message
      </label>
      <input
        id="widget-message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a message…"
        autoComplete="off"
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
  );
}
