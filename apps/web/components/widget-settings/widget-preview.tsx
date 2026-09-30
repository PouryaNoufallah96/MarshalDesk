"use client";

import { type ReactNode, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  WidgetAppearance,
  WidgetMessage,
} from "@/components/widget/types";
import { WidgetLauncher } from "@/components/widget/widget-launcher";
import { widgetThemeStyle } from "@/components/widget/widget-theme";
import { WidgetWindow } from "@/components/widget/widget-window";
import { cn } from "@/lib/utils";
import {
  mockPreviewAgentOffConversation,
  mockPreviewConversation,
} from "@/lib/widget/mock-data";

const PREVIEW_STATES = ["start", "conversation"] as const;
type PreviewState = (typeof PREVIEW_STATES)[number];

const previewStateLabels: Record<PreviewState, string> = {
  start: "New visitor",
  conversation: "After a message",
};

function previewMessages(
  state: PreviewState,
  agentEnabled: boolean,
): readonly WidgetMessage[] {
  switch (state) {
    case "start":
      return [];
    case "conversation":
      return agentEnabled
        ? mockPreviewConversation
        : mockPreviewAgentOffConversation;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function BrowserFrame({
  domain,
  children,
}: {
  domain: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[min(680px,calc(100svh-var(--header-height)-8rem))] min-h-[520px] flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/40 px-3.5 py-2.5">
        <span
          aria-hidden
          className="mr-1 ml-1.5 size-[5px] rounded-full bg-foreground/25 shadow-[-9px_0_0_var(--color-muted-foreground),9px_0_0_var(--color-muted-foreground)] [--color-muted-foreground:color-mix(in_oklch,var(--foreground)_25%,transparent)]"
        />
        <p className="min-w-0 flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          {domain}
        </p>
        <span className="w-9" aria-hidden />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-(--widget-accent)/[0.06]">
        {children}
      </div>
    </div>
  );
}

/** Grey blocks that stand in for the customer's page behind the widget. */
function PagePlaceholder() {
  return (
    <div aria-hidden className="flex flex-col gap-4 p-6 opacity-70">
      <div className="h-5 w-2/5 rounded-md bg-foreground/8" />
      <div className="flex flex-col gap-2">
        <div className="h-2.5 w-full rounded-full bg-foreground/6" />
        <div className="h-2.5 w-11/12 rounded-full bg-foreground/6" />
        <div className="h-2.5 w-3/4 rounded-full bg-foreground/6" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-lg bg-foreground/6" />
        <div className="h-20 rounded-lg bg-foreground/6" />
        <div className="h-20 rounded-lg bg-foreground/6" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-2.5 w-10/12 rounded-full bg-foreground/6" />
        <div className="h-2.5 w-full rounded-full bg-foreground/6" />
      </div>
    </div>
  );
}

export function WidgetPreview({
  appearance,
  domain,
  className,
}: {
  appearance: WidgetAppearance;
  domain: string;
  className?: string;
}) {
  const [state, setState] = useState<PreviewState>("start");
  const alignEnd = appearance.position === "bottom-right";

  return (
    <section
      aria-labelledby="widget-preview-title"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <h2
          id="widget-preview-title"
          className="text-base font-semibold tracking-[-0.01em]"
        >
          Preview
        </h2>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          value={[state]}
          onValueChange={(value) => {
            const next = PREVIEW_STATES.find((option) => option === value[0]);
            if (next) setState(next);
          }}
          aria-label="Preview state"
        >
          {PREVIEW_STATES.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {previewStateLabels[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div style={widgetThemeStyle(appearance.color)}>
        <BrowserFrame domain={domain}>
          <PagePlaceholder />
          <div
            style={widgetThemeStyle(appearance.color)}
            className={cn(
              "absolute inset-4 flex flex-col justify-end gap-3",
              alignEnd ? "items-end" : "items-start",
            )}
          >
            <WidgetWindow
              preview
              appearance={appearance}
              messages={previewMessages(state, appearance.agentEnabled)}
              className="min-h-0 w-full max-w-[360px] flex-1"
            />
            <div inert>
              <WidgetLauncher open />
            </div>
          </div>
        </BrowserFrame>
      </div>
      <p className="px-0.5 text-xs text-muted-foreground">
        This is the widget visitors see, updated as you change settings.
      </p>
    </section>
  );
}
