import {
  defaultShouldDehydrateQuery,
  dehydrate,
  HydrationBoundary,
  matchQuery,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { WidgetSettingsScreen } from "@/components/widget-settings/widget-settings-screen";
import { orpcServer } from "@/lib/orpc/server";
import { getQueryClient } from "@/lib/query/client";

export const metadata: Metadata = {
  title: "Home · MarshalDesk",
};

export default async function DashboardHomePage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(orpcServer.knowledge.get.queryOptions());
  const knowledgeKey = orpcServer.knowledge.key();

  return (
    // The layout already dehydrates the shared queries.
    <HydrationBoundary
      state={dehydrate(queryClient, {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) &&
          matchQuery({ queryKey: knowledgeKey }, query),
      })}
    >
      <WidgetSettingsScreen />
    </HydrationBoundary>
  );
}
