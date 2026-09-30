"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_GREETING,
  defaultAgentName,
  type WidgetSettings,
  type WidgetSettingsInput,
  widgetSettingsSchema,
} from "@marshaldesk/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useDashboardAccent } from "@/components/dashboard/accent-provider";
import { Toaster } from "@/components/ui/sonner";
import type { WidgetAppearance } from "@/components/widget/types";
import { widgetAccent } from "@/components/widget/widget-theme";
import { orpc } from "@/lib/orpc/client";
import { generatedAgentAvatarUrl } from "@/lib/widget/agent-avatar";
import { embedSnippet } from "@/lib/widget/embed-snippet";
import {
  MOCK_WIDGET_SCRIPT_URL,
  mockSetupProgress,
  mockSuggestedQuestions,
} from "@/lib/widget/mock-data";
import { InstallSection } from "./install-section";
import { KnowledgeSection } from "./knowledge-section";
import { AgentToggle } from "./agent-toggle";
import { MessagesSection } from "./messages-section";
import { PageHeader } from "./page-header";
import { SetupProgress } from "./setup-progress";
import { useAvatarUpload } from "./use-avatar-upload";
import { useWidgetSettingsAutosave } from "./use-widget-settings-autosave";
import { WidgetPreview } from "./widget-preview";
import { AppearanceSection } from "./appearance-section";
import { DomainsSection } from "./domains-section";

export function WidgetSettingsScreen() {
  const {
    data: { workspace },
  } = useSuspenseQuery(orpc.owner.getCurrent.queryOptions());

  const { data: saved } = useSuspenseQuery(
    orpc.widgetSettings.get.queryOptions(),
  );

  // Seeded once: later cache updates come from our own saves and must not
  // reset what the owner is typing.
  const [defaultValues] = useState(() => saved.settings);
  const form = useForm<WidgetSettingsInput, unknown, WidgetSettings>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues,
    mode: "onChange",
  });
  const autosave = useWidgetSettingsAutosave(form, defaultValues);
  const [agentEnabled, agentName, color, position, greeting, allowedDomains] =
    useWatch({
      control: form.control,
      name: [
        "agentEnabled",
        "agentName",
        "color",
        "position",
        "greeting",
        "allowedDomains",
      ],
    });

  const { setColor: setDashboardColor } = useDashboardAccent();
  useEffect(() => setDashboardColor(color), [color, setDashboardColor]);

  const avatarUpload = useAvatarUpload();
  const displayName = agentName.trim() || defaultAgentName(workspace.name);
  const generatedAvatarUrl = useMemo(
    () => generatedAgentAvatarUrl(displayName, widgetAccent(color).background),
    [displayName, color],
  );
  const avatarUrl = avatarUpload.url ?? generatedAvatarUrl;

  const appearance: WidgetAppearance = {
    agentEnabled,
    agentName: displayName,
    agentAvatarUrl: avatarUrl,
    color,
    position,
    greeting: greeting.trim() || DEFAULT_GREETING,
    suggestedQuestions: mockSuggestedQuestions,
  };

  const setupSteps = [
    {
      id: "source",
      label: "Add a source",
      hint: "Teach the agent what you know.",
      href: "#knowledge",
      done: mockSetupProgress.hasReadySource,
    },
    {
      id: "domain",
      label: "Add an allowed domain",
      hint: "Choose where the widget loads.",
      href: "#domains",
      done: allowedDomains.length > 0,
    },
    {
      id: "install",
      label: "Install the snippet",
      hint: "Paste one line on your site.",
      href: "#install",
      done: mockSetupProgress.snippetInstalled,
    },
  ];

  return (
    <div className="@container flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <PageHeader autosave={autosave} />
      <SetupProgress steps={setupSteps} />

      <div className="grid gap-8 @5xl:grid-cols-[minmax(0,1fr)_25rem] @5xl:grid-rows-[auto_1fr] @5xl:items-start @5xl:gap-y-4">
        <div className="mx-auto flex w-full max-w-[25rem] flex-col gap-3 @5xl:col-start-2 @5xl:row-start-1 @5xl:mx-0">
          <AgentToggle form={form} agentEnabled={agentEnabled} />
          {agentEnabled ? null : (
            <p
              role="status"
              className="rounded-xl bg-muted px-4 py-3 text-[13px]/snug text-muted-foreground"
            >
              The widget works as live chat, and every new conversation lands in
              your inbox as waiting. Visitors still see your greeting, but not
              the suggested questions or the &ldquo;Talk to a human&rdquo;
              button.
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-8 @5xl:col-start-1 @5xl:row-span-2 @5xl:row-start-1">
          <AppearanceSection
            form={form}
            agentName={displayName}
            avatarUrl={avatarUrl}
            upload={avatarUpload}
          />
          <MessagesSection
            form={form}
            greeting={greeting}
            questions={mockSuggestedQuestions}
            agentEnabled={agentEnabled}
          />
          <KnowledgeSection />
          <DomainsSection form={form} domains={allowedDomains} />
          <InstallSection
            snippet={embedSnippet(MOCK_WIDGET_SCRIPT_URL, workspace.id)}
          />
        </div>
        <WidgetPreview
          appearance={appearance}
          domain={allowedDomains[0] ?? "yourwebsite.com"}
          className="mx-auto w-full max-w-[25rem] @5xl:sticky @5xl:top-6 @5xl:col-start-2 @5xl:row-start-2 @5xl:mx-0"
        />
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
