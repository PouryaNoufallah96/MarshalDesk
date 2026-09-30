"use client";

import { Controller } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WidgetSettingsForm } from "./form";

export function PageHeader({
  form,
  agentEnabled,
}: {
  form: WidgetSettingsForm;
  agentEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex max-w-xl flex-col gap-1.5">
          <h1 className="font-display text-3xl tracking-[-0.04em]">Widget</h1>
          <p className="text-sm text-muted-foreground">
            Choose how the widget looks and behaves on your website. The preview
            updates as you go. Saving isn&apos;t available yet, so changes last
            until you leave this page.
          </p>
        </div>
        <Controller
          control={form.control}
          name="agentEnabled"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-card py-2.5 pr-3 pl-3.5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50">
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full transition-colors",
                  agentEnabled
                    ? "bg-brand shadow-[0_0_0_3px_color-mix(in_oklch,var(--brand)_25%,transparent)]"
                    : "bg-muted-foreground/40",
                )}
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">Agent</span>
                <span className="text-xs text-muted-foreground">
                  {agentEnabled ? "Answering visitors" : "Off, live chat only"}
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
      </div>
      {agentEnabled ? null : (
        <p
          role="status"
          className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          The agent is off, so the widget works as live chat. Every new
          conversation lands in your inbox as waiting. Visitors still see your
          greeting, but not the suggested questions or the &ldquo;Talk to a
          human&rdquo; button.
        </p>
      )}
    </div>
  );
}
