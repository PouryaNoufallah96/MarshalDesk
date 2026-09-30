"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useInboxStore } from "@/components/inbox/inbox-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { visitorAvatarUrl } from "@/lib/inbox/visitor-avatar";
import { orpc } from "@/lib/orpc/client";

type Size = "sm" | "default" | "lg";

export function useOwner() {
  return useSuspenseQuery(orpc.owner.getCurrent.queryOptions()).data.owner;
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
  const { agent } = useInboxStore();
  return (
    <Avatar size={size}>
      <AvatarImage src={agent.avatarUrl} alt={agent.name} />
      <AvatarFallback>{initialsOf(agent.name)}</AvatarFallback>
    </Avatar>
  );
}

export function MemberAvatar({ size = "default" }: { size?: Size }) {
  const owner = useOwner();
  return (
    <Avatar size={size}>
      <AvatarImage src={owner.avatarUrl} alt={owner.name} />
      <AvatarFallback>{initialsOf(owner.name)}</AvatarFallback>
    </Avatar>
  );
}
