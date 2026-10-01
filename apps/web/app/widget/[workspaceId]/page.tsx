import { ORPCError, safe } from "@orpc/client";
import { notFound } from "next/navigation";
import { WidgetApp } from "@/components/widget/widget-app";
import { widgetAccent } from "@/components/widget/widget-theme";
import { serverClient } from "@/lib/orpc/server";
import { generatedAgentAvatarUrl } from "@/lib/widget/agent-avatar";

export default async function WidgetPage({
  params,
  searchParams,
}: PageProps<"/widget/[workspaceId]">) {
  const { workspaceId } = await params;
  const { host } = await searchParams;

  const [error, config] = await safe(
    serverClient.widget.getConfig({ workspaceId }),
  );
  if (error) {
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  }

  const agentAvatarUrl =
    config.agentAvatarUrl ??
    generatedAgentAvatarUrl(
      config.agentName,
      widgetAccent(config.color).background,
    );

  return (
    <WidgetApp
      config={config}
      agentAvatarUrl={agentAvatarUrl}
      host={typeof host === "string" ? host : null}
    />
  );
}
