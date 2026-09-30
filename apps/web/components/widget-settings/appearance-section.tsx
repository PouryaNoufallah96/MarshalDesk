"use client";

import {
  AGENT_AVATAR_MAX_BYTES,
  AGENT_AVATAR_MIME_TYPES,
  WIDGET_COLORS,
  WIDGET_LIGHT_TEXT,
  WIDGET_POSITIONS,
  type WidgetColor,
  type WidgetPosition,
} from "@marshaldesk/shared";
import { Controller, useWatch } from "react-hook-form";
import type { CSSProperties } from "react";
import { Dropzone } from "@/components/dashboard/dropzone";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/dashboard/settings-section";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WidgetAvatar } from "@/components/widget/widget-avatar";
import {
  widgetAccent,
  widgetThemeStyle,
} from "@/components/widget/widget-theme";
import { cn } from "@/lib/utils";
import type { WidgetSettingsForm } from "./form";
import { type AvatarUpload, avatarRequirements } from "./use-avatar-upload";

const colorLabels: Record<WidgetColor, string> = {
  blue: "Blue",
  indigo: "Indigo",
  violet: "Violet",
  pink: "Pink",
  red: "Red",
  orange: "Orange",
  green: "Green",
};

const positionLabels: Record<WidgetPosition, string> = {
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};

function AvatarRow({
  agentName,
  avatarUrl,
  upload,
}: {
  agentName: string;
  avatarUrl: string;
  upload: AvatarUpload;
}) {
  const uploading = upload.progress !== null;
  return (
    <SettingsRow
      label="Agent avatar"
      description="Shown next to the agent's messages. Optional."
    >
      <div className="flex flex-wrap items-center gap-4">
        <WidgetAvatar
          name={agentName}
          src={avatarUrl}
          className="size-14 ring-1 ring-foreground/10"
        />
        <Dropzone
          compact
          accept={AGENT_AVATAR_MIME_TYPES}
          maxBytes={AGENT_AVATAR_MAX_BYTES}
          disabled={uploading || upload.removing}
          title={
            uploading
              ? "Uploading…"
              : upload.url
                ? "Replace the image"
                : "Drop an image"
          }
          hint={uploading || upload.url ? undefined : avatarRequirements}
          onFiles={([file]) => file && upload.select(file)}
          onReject={([rejection]) => rejection && upload.fail(rejection.reason)}
          className="min-w-48 flex-1"
        >
          {uploading ? (
            <Progress
              value={upload.progress}
              aria-label="Upload progress"
              className="ml-auto w-24"
            />
          ) : null}
        </Dropzone>
        {upload.url ? (
          <Button
            type="button"
            variant="ghost"
            disabled={uploading || upload.removing}
            onClick={upload.remove}
          >
            {upload.removing ? "Removing…" : "Remove"}
          </Button>
        ) : null}
      </div>
      {upload.error ? (
        <FieldError>{upload.error}</FieldError>
      ) : upload.url ? null : (
        <FieldDescription>
          Until you add one, the agent gets an avatar generated from its name.
        </FieldDescription>
      )}
    </SettingsRow>
  );
}

function ColorSwatches({
  value,
  onChange,
}: {
  value: WidgetColor;
  onChange: (color: WidgetColor) => void;
}) {
  const selected = widgetAccent(value);
  const textIsLight = selected.foreground === WIDGET_LIGHT_TEXT;

  return (
    <>
      <RadioGroup
        aria-label="Accent color"
        value={value}
        onValueChange={(next) => {
          const color = WIDGET_COLORS.find((option) => option === next);
          if (color) onChange(color);
        }}
        className="flex flex-wrap gap-3"
      >
        {WIDGET_COLORS.map((color) => {
          const accent = widgetAccent(color);
          return (
            <RadioGroupItem
              key={color}
              value={color}
              aria-label={colorLabels[color]}
              title={colorLabels[color]}
              style={
                {
                  "--swatch": accent.background,
                  "--swatch-foreground": accent.foreground,
                } as CSSProperties
              }
              className={cn(
                "size-8 border-0 bg-(--swatch) outline-offset-2 outline-(--swatch) transition-transform duration-150 ease-out hover:scale-105 active:scale-95 dark:bg-(--swatch) data-checked:bg-(--swatch) data-checked:outline-2 data-checked:outline-solid dark:data-checked:bg-(--swatch)",
                "[&_[data-slot=radio-group-indicator]_span]:size-2.5 [&_[data-slot=radio-group-indicator]_span]:bg-(--swatch-foreground)",
              )}
            />
          );
        })}
      </RadioGroup>
      <FieldDescription>
        {colorLabels[value]}, with {textIsLight ? "white" : "dark"} text so it
        stays readable.
      </FieldDescription>
    </>
  );
}

/** A tiny page with the widget docked in the corner, in the chosen accent color. */
function PositionIllustration({ position }: { position: WidgetPosition }) {
  const end = position === "bottom-right";
  return (
    <span
      aria-hidden
      className="relative block aspect-[2/1] w-full overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10"
    >
      <span
        className={cn(
          "absolute top-3 flex w-1/3 flex-col gap-1.5",
          end ? "left-3" : "right-3 items-end",
        )}
      >
        <span className="h-1.5 w-3/5 rounded-full bg-foreground/15" />
        <span className="h-1 w-full rounded-full bg-foreground/8" />
        <span className="h-1 w-4/5 rounded-full bg-foreground/8" />
      </span>
      <span
        className={cn(
          "absolute top-[12%] bottom-2 flex w-[30%] flex-col gap-1",
          end ? "right-2 items-end" : "left-2 items-start",
        )}
      >
        <span className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-md bg-card shadow-soft ring-1 ring-foreground/15">
          <span className="h-[18%] shrink-0 bg-(--widget-accent)" />
          <span className="mx-[10%] mt-[9%] h-[6%] w-1/2 rounded-full bg-foreground/15" />
          <span className="mx-[10%] mt-[6%] h-[6%] w-3/4 rounded-full bg-foreground/10" />
          <span className="mx-[8%] mt-auto mb-[8%] h-[10%] rounded-sm bg-foreground/8" />
        </span>
        <span className="aspect-square h-[16%] max-h-5 shrink-0 rounded-full bg-(--widget-accent) shadow-soft" />
      </span>
    </span>
  );
}

export function AppearanceSection({
  form,
  agentName,
  avatarUrl,
  upload,
}: {
  form: WidgetSettingsForm;
  agentName: string;
  avatarUrl: string;
  upload: AvatarUpload;
}) {
  const { errors } = form.formState;
  const color = useWatch({ control: form.control, name: "color" });

  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="How the widget looks on your website."
    >
      <SettingsRow
        label="Agent name"
        htmlFor="agent-name"
        description="Shown at the top of the widget and next to the agent's messages."
      >
        <Input
          id="agent-name"
          size="lg"
          autoComplete="off"
          aria-invalid={!!errors.agentName}
          {...form.register("agentName")}
        />
        <FieldError errors={[errors.agentName]} />
      </SettingsRow>

      <AvatarRow agentName={agentName} avatarUrl={avatarUrl} upload={upload} />

      <SettingsRow
        label="Accent color"
        description="Used for the header, the launcher and visitor messages."
      >
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <ColorSwatches value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsRow>

      <SettingsRow
        label="Position"
        description="Which corner of the page the launcher sits in."
      >
        <Controller
          control={form.control}
          name="position"
          render={({ field }) => (
            <RadioGroup
              aria-label="Position"
              value={field.value}
              onValueChange={(next) => {
                const position = WIDGET_POSITIONS.find(
                  (option) => option === next,
                );
                if (position) field.onChange(position);
              }}
              className="grid grid-cols-2 gap-3"
              style={widgetThemeStyle(color)}
            >
              {WIDGET_POSITIONS.map((position) => (
                <label
                  key={position}
                  htmlFor={`position-${position}`}
                  className="flex cursor-pointer flex-col gap-2.5 rounded-xl p-2 ring-1 ring-foreground/10 transition-colors duration-150 hover:bg-muted/50 has-focus-visible:ring-2 has-focus-visible:ring-ring has-data-checked:bg-muted/60 has-data-checked:ring-2 has-data-checked:ring-foreground"
                >
                  <PositionIllustration position={position} />
                  <span className="flex items-center justify-between gap-2 px-0.5 pb-0.5 text-sm font-medium">
                    {positionLabels[position]}
                    <RadioGroupItem
                      id={`position-${position}`}
                      value={position}
                    />
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
