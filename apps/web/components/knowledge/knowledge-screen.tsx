"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";
import { KnowledgeSection } from "./knowledge-section";

function AgentState({ hasKnowledge }: { hasKnowledge: boolean }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          hasKnowledge
            ? "bg-brand shadow-[0_0_0_3px_color-mix(in_oklch,var(--brand)_25%,transparent)]"
            : "bg-muted-foreground/40",
        )}
      />
      {hasKnowledge
        ? "The agent is answering visitors"
        : "The agent is off until a source is ready"}
    </p>
  );
}

export function KnowledgeScreen() {
  const {
    data: { hasKnowledge },
  } = useSuspenseQuery(orpc.knowledge.get.queryOptions());

  return (
    <div className="flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex max-w-xl flex-col gap-1.5">
          <h1 className="font-display text-3xl tracking-[-0.04em]">
            Knowledge base
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything the agent answers from. Add files or text, and check what
            it learned.
          </p>
        </div>
        <AgentState hasKnowledge={hasKnowledge} />
      </div>
      <KnowledgeSection />
    </div>
  );
}
