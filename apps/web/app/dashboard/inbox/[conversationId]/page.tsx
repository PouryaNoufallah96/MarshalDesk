import type { Metadata } from "next";
import { mockVisitorCity } from "@/lib/inbox/mock-data";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/inbox/[conversationId]">): Promise<Metadata> {
  const { conversationId } = await params;
  const city = mockVisitorCity(conversationId);
  return {
    title: city
      ? `Visitor from ${city} · Inbox · MarshalDesk`
      : "Inbox · MarshalDesk",
  };
}

/** The conversation renders from the inbox layout, which reads the id from the URL. */
export default function ConversationPage() {
  return null;
}
