"use client";

import { KnowledgeSection } from "./knowledge-section";

export function KnowledgeScreen() {
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
      </div>
      <KnowledgeSection />
    </div>
  );
}
