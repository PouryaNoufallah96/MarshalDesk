"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WidgetSettingsAutosave } from "./use-widget-settings-autosave";

function SavingDots() {
  return (
    <span aria-hidden className="flex items-center gap-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1 animate-pulse rounded-full bg-current motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function StatusContent({ autosave }: { autosave: WidgetSettingsAutosave }) {
  switch (autosave.status) {
    case "idle":
      return null;
    case "pending":
    case "saving":
      return (
        <>
          <SavingDots />
          Saving…
        </>
      );
    case "saved":
      return (
        <>
          <CheckIcon className="size-3.5" aria-hidden />
          Saved
        </>
      );
    case "invalid":
      return <>Not saved until the errors are fixed</>;
    case "failed":
      return (
        <>
          <span className="text-destructive">Couldn&apos;t save</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={autosave.retry}
          >
            Retry
          </Button>
        </>
      );
    default: {
      const unhandled: never = autosave.status;
      return unhandled;
    }
  }
}

export function SaveStatus({ autosave }: { autosave: WidgetSettingsAutosave }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex min-h-6 items-center gap-2 text-[13px] text-muted-foreground"
    >
      <StatusContent autosave={autosave} />
    </p>
  );
}
