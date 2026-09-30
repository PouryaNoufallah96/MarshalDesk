import type { WidgetSettings, WidgetSettingsInput } from "@marshaldesk/shared";
import type { UseFormReturn } from "react-hook-form";

export type WidgetSettingsForm = UseFormReturn<
  WidgetSettingsInput,
  unknown,
  WidgetSettings
>;
