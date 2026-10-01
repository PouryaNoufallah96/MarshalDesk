"use client";

import { Controller } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WidgetSettingsForm } from "./form";

function statusLine(agentEnabled: boolean, hasKnowledge: boolean): string {
  if (!agentEnabled) return "Off, live chat only";
  return hasKnowledge ? "Answering visitors" : "Off until a source is ready";
}

export function AgentToggle({
  form,
  agentEnabled,
  hasKnowledge,
  className,
}: {
  form: WidgetSettingsForm;
  agentEnabled: boolean;
  hasKnowledge: boolean;
  className?: string;
}) {
  const active = agentEnabled && hasKnowledge;
  return (
    <Controller
      control={form.control}
      name="agentEnabled"
      render={({ field }) => (
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl bg-card py-2.5 pr-3 pl-3.5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50",
            className,
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full transition-colors",
              active
                ? "bg-brand shadow-[0_0_0_3px_color-mix(in_oklch,var(--brand)_25%,transparent)]"
                : "bg-muted-foreground/40",
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-sm font-medium">Agent</span>
            <span className="text-xs text-muted-foreground">
              {statusLine(agentEnabled, hasKnowledge)}
            </span>
          </span>
          <Switch
            aria-label="Agent"
            checked={field.value}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            inputRef={field.ref}
          />
        </label>
      )}
    />
  );
}
