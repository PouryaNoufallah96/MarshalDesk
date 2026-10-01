import type { ConversationDetail } from "@marshaldesk/shared";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { visitorLabel } from "@/lib/inbox/format";
import { orpcServer } from "@/lib/orpc/server";
import { getQueryClient } from "@/lib/query/client";

/** Shares the request's query client, so metadata and the page fetch once. */
async function fetchConversation(
  id: string,
): Promise<ConversationDetail | null> {
  try {
    return await getQueryClient().fetchQuery(
      orpcServer.inbox.get.queryOptions({ input: { id } }),
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/inbox/[conversationId]">): Promise<Metadata> {
  const { conversationId } = await params;
  const conversation = await fetchConversation(conversationId);
  return {
    title: conversation
      ? `${visitorLabel(conversation.visitor)} · Inbox · MarshalDesk`
      : "Inbox · MarshalDesk",
  };
}

/** The conversation renders from the inbox layout; this only prefetches it. */
export default async function ConversationPage({
  params,
}: PageProps<"/dashboard/inbox/[conversationId]">) {
  const { conversationId } = await params;
  await fetchConversation(conversationId);
  return <HydrationBoundary state={dehydrate(getQueryClient())} />;
}
