"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { orpc } from "@/lib/orpc/client";

export function ChunkPreviewDialog({
  source,
  open,
  onOpenChange,
}: {
  source: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pr-12">
          <DialogTitle className="truncate leading-snug">
            {source?.name ?? "Chunks"}
          </DialogTitle>
          <DialogDescription>
            The pieces the agent searches when it answers. If an answer looks
            wrong, check what it had to work with here.
          </DialogDescription>
        </DialogHeader>
        {source ? <ChunkList sourceId={source.id} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ChunkList({ sourceId }: { sourceId: string }) {
  const chunks = useQuery(
    orpc.knowledge.listChunks.queryOptions({ input: { id: sourceId } }),
  );

  if (chunks.isPending) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
        Loading chunks…
      </p>
    );
  }
  if (chunks.isError) {
    return (
      <FieldError className="p-6">
        Couldn&apos;t load the chunks. Try again.
      </FieldError>
    );
  }
  if (chunks.data.chunks.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        This source has no chunks yet. They show up once it&apos;s ready.
      </p>
    );
  }
  return (
    <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4">
      {chunks.data.chunks.map((chunk) => (
        <li
          key={chunk.id}
          className="flex flex-col rounded-lg ring-1 ring-foreground/10"
        >
          <p className="flex items-center justify-between gap-4 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">
              Chunk {chunk.position + 1}
            </span>
            <span>
              {chunk.tokenCount.toLocaleString("en-US")}{" "}
              {chunk.tokenCount === 1 ? "token" : "tokens"}
            </span>
          </p>
          <pre className="px-3 py-2.5 font-mono text-xs/relaxed break-words whitespace-pre-wrap">
            {chunk.content}
          </pre>
        </li>
      ))}
    </ol>
  );
}
