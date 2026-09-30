"use client";

import type { MessageMember } from "@marshaldesk/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import { widgetAccent } from "@/components/widget/widget-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { visitorAvatarUrl } from "@/lib/inbox/visitor-avatar";
import { orpc } from "@/lib/orpc/client";
import { generatedAgentAvatarUrl } from "@/lib/widget/agent-avatar";

type Size = "sm" | "default" | "lg";

export function useOwner() {
  return useSuspenseQuery(orpc.owner.getCurrent.queryOptions()).data.owner;
}

/** The agent as the widget shows it, so a rename in settings shows here too. */
export function useAgent(): { name: string; avatarUrl: string } {
  const { settings, agentAvatarUrl } = useSuspenseQuery(
    orpc.widgetSettings.get.queryOptions(),
  ).data;
  return {
    name: settings.agentName,
    avatarUrl:
      agentAvatarUrl ??
      generatedAgentAvatarUrl(
        settings.agentName,
        widgetAccent(settings.color).background,
      ),
  };
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export function VisitorAvatar({
  visitorId,
  size = "default",
  className,
}: {
  visitorId: string;
  size?: Size;
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={visitorAvatarUrl(visitorId)} alt="" />
      <AvatarFallback>V</AvatarFallback>
    </Avatar>
  );
}

export function AgentAvatar({ size = "default" }: { size?: Size }) {
  const agent = useAgent();
  return (
    <Avatar size={size}>
      <AvatarImage src={agent.avatarUrl} alt={agent.name} />
      <AvatarFallback>{initialsOf(agent.name)}</AvatarFallback>
    </Avatar>
  );
}

export function MemberAvatar({
  member,
  size = "default",
}: {
  member: MessageMember;
  size?: Size;
}) {
  return (
    <Avatar size={size}>
      <AvatarImage src={member.avatarUrl} alt={member.name} />
      <AvatarFallback>{initialsOf(member.name)}</AvatarFallback>
    </Avatar>
  );
}
