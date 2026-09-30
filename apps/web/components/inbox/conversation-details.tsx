"use client";

import type { ReactNode } from "react";
import { useInboxStore } from "@/components/inbox/inbox-store";
import { VisitorAvatar } from "@/components/inbox/participant-avatar";
import { RelativeTime } from "@/components/inbox/relative-time";
import { StateBadge } from "@/components/inbox/state-badge";
import {
  deviceLabel,
  displayUrl,
  handoffReasonLabel,
  languageName,
  locationLabel,
  visitorLabel,
  stateDescription,
  visitorLocalTime,
} from "@/lib/inbox/format";
import type { Conversation } from "@/lib/inbox/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-0.5 text-sm font-semibold tracking-[-0.01em]">
        {title}
      </h3>
      <dl className="divide-y">{children}</dl>
    </section>
  );
}

export function ConversationDetails({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { now } = useInboxStore();
  const { visitor } = conversation;
  const { details } = visitor;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-0.5">
        <VisitorAvatar
          visitorId={visitor.id}
          className="size-14 ring-1 ring-foreground/10"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-semibold tracking-[-0.01em]">
            {visitorLabel(visitor)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {locationLabel(details)}
          </p>
        </div>
      </div>
      <Section title="Visitor">
        <Row label="Location">{locationLabel(details)}</Row>
        <Row label="Local time">
          {visitorLocalTime(details.timezone, now)}
          <span className="block text-xs text-muted-foreground">
            {details.timezone.replaceAll("_", " ")}
          </span>
        </Row>
        <Row label="Language">{languageName(details.language)}</Row>
        <Row label="Device">{deviceLabel(details.device)}</Row>
        <Row label="Browser">{details.browser}</Row>
        <Row label="System">{details.os}</Row>
        <Row label="Current page">
          <a
            href={details.page}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {displayUrl(details.page)}
          </a>
        </Row>
        <Row label="Came from">
          {details.referrer ? (
            displayUrl(details.referrer)
          ) : (
            <span className="text-muted-foreground">Direct visit</span>
          )}
        </Row>
        <Row label="First seen">
          <RelativeTime iso={visitor.firstSeenAt} />
        </Row>
        <Row label="Last seen">
          <RelativeTime iso={visitor.lastSeenAt} />
        </Row>
        <Row label="Visits">
          <span className="tabular-nums">{details.visitCount}</span>
        </Row>
      </Section>
      <Section title="Conversation">
        <Row label="State">
          <span className="flex flex-col items-start gap-1">
            <StateBadge state={conversation.state} />
            <span className="text-xs text-muted-foreground">
              {stateDescription(conversation.state)}
            </span>
          </span>
        </Row>
        <Row label="Handoff reason">
          {conversation.handoffReason ? (
            handoffReasonLabel(conversation.handoffReason)
          ) : (
            <span className="text-muted-foreground">No handoff</span>
          )}
        </Row>
        <Row label="Started">
          <RelativeTime iso={conversation.createdAt} />
        </Row>
        <Row label="Last message">
          <RelativeTime iso={conversation.lastMessageAt} />
        </Row>
        {conversation.closedAt ? (
          <Row label="Closed">
            <RelativeTime iso={conversation.closedAt} />
          </Row>
        ) : null}
      </Section>
    </div>
  );
}
