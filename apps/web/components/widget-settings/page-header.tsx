"use client";

import { SaveStatus } from "./save-status";
import type { WidgetSettingsAutosave } from "./use-widget-settings-autosave";

export function PageHeader({ autosave }: { autosave: WidgetSettingsAutosave }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
      <div className="flex max-w-xl flex-col gap-1.5">
        <h1 className="font-display text-3xl tracking-[-0.04em]">Widget</h1>
        <p className="text-sm text-muted-foreground">
          Choose how the widget looks and behaves on your website. The preview
          updates as you go, and changes save automatically.
        </p>
      </div>
      <SaveStatus autosave={autosave} />
    </div>
  );
}
