"use client";

import {
  type Source,
  SOURCE_FILE_EXTENSIONS,
  SOURCE_MAX_BYTES,
  type SourceKind,
  type SourceStatus,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  BookOpenIcon,
  CheckIcon,
  EyeIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Dropzone } from "@/components/dashboard/dropzone";
import { IconButton } from "@/components/dashboard/icon-button";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { removeSource } from "@/lib/knowledge/cache";
import { client, orpc } from "@/lib/orpc/client";
import { useArrivals } from "@/lib/use-arrivals";
import { cn } from "@/lib/utils";
import { ChunkPreviewDialog } from "@/components/dashboard/chunk-preview-dialog";
import { SourceTypeIcon } from "./source-type-icon";
import { TextSourceDialog } from "./text-source-dialog";
import { type SourceUploadItem, useSourceUploads } from "./use-source-upload";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

function formatSize(kind: SourceKind, size: number): string {
  switch (kind) {
    case "file":
      return formatBytes(size);
    case "text":
      return plural(size, "character", "characters");
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/** Lucide's check, drawn in once when a source turns ready while you watch. */
function DrawnCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M20 6 9 17l-5-5"
        pathLength={1}
        className="animate-draw [stroke-dasharray:1] motion-reduce:animate-none"
      />
    </svg>
  );
}

function StatusBadge({
  status,
  changed = false,
}: {
  status: SourceStatus;
  /** The status changed while the page was open, so it animates in. */
  changed?: boolean;
}) {
  const enter = changed ? "animate-fade-in motion-reduce:animate-none" : "";
  switch (status) {
    case "uploaded":
      return (
        <Badge variant="outline" className={enter}>
          Uploaded
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
            enter,
          )}
        >
          <Loader2Icon className="animate-spin" aria-hidden />
          Processing
        </Badge>
      );
    case "ready":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            enter,
          )}
        >
          {changed ? <DrawnCheckIcon /> : <CheckIcon aria-hidden />}
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className={enter}>
          <TriangleAlertIcon aria-hidden />
          Failed
        </Badge>
      );
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function UploadingBadge() {
  return (
    <Badge variant="outline">
      <Loader2Icon className="animate-spin" aria-hidden />
      Uploading
    </Badge>
  );
}

/** Whether a previous version of this source still answers while it's re-processed. */
function isReplacing(source: Source): boolean {
  switch (source.status) {
    case "uploaded":
    case "processing":
      return source.chunkCount > 0;
    case "ready":
    case "failed":
      return false;
    default: {
      const unreachable: never = source.status;
      return unreachable;
    }
  }
}

function sourceMeta(source: Source): ReactNode {
  const size = formatSize(source.kind, source.size);
  switch (source.status) {
    case "failed":
      return (
        <span className="whitespace-normal text-destructive">
          {source.error ?? "Couldn't process this source."}
        </span>
      );
    case "ready": {
      const ready = `${size} · ${plural(source.chunkCount, "chunk", "chunks")}`;
      if (!source.error) return ready;
      return (
        <>
          {ready}
          <span className="block whitespace-normal text-amber-700 dark:text-amber-300">
            The new version couldn&apos;t be processed, so the previous one is
            still answering: {source.error}
          </span>
        </>
      );
    }
    case "uploaded":
    case "processing":
      return isReplacing(source)
        ? `${size} · Replacing, the current version keeps answering`
        : size;
    default: {
      const unreachable: never = source.status;
      return unreachable;
    }
  }
}

function UploadMeta({ upload }: { upload: SourceUploadItem }) {
  if (upload.error) {
    return <span className="text-destructive">{upload.error}</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <Progress
        value={upload.progress ?? 0}
        aria-label={`Uploading ${upload.name}`}
        className="w-24 shrink-0"
      />
      <span className="tabular-nums">{upload.progress ?? 0}%</span>
    </span>
  );
}

function RowShell({
  kind,
  name,
  meta,
  badge,
  onOpen,
  entering = false,
  children,
}: {
  kind: SourceKind;
  name: string;
  meta: ReactNode;
  badge: ReactNode;
  /** Opens the chunk preview; the name becomes a button when set. */
  onOpen?: () => void;
  /** The row appeared after the page loaded. */
  entering?: boolean;
  children?: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2.5 pr-2.5 pl-4 md:pl-5",
        entering && "animate-enter motion-reduce:animate-none",
      )}
    >
      <SourceTypeIcon kind={kind} name={name} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            title={`View the chunks of ${name}`}
            className="w-fit max-w-full truncate rounded-sm text-left text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {name}
          </button>
        ) : (
          <span className="truncate text-sm font-medium" title={name}>
            {name}
          </span>
        )}
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      {badge}
      <span className="flex shrink-0 items-center gap-0.5">{children}</span>
    </li>
  );
}

function DeleteSourceButton({ source }: { source: Source }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => client.knowledge.deleteSource({ id: source.id }),
    onSuccess: () => {
      removeSource(queryClient, source.id);
      setOpen(false);
    },
    onError: (error) => {
      if (error instanceof ORPCError && error.code === "NOT_FOUND") {
        removeSource(queryClient, source.id);
        setOpen(false);
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (remove.isPending) return;
        if (next) remove.reset();
        setOpen(next);
      }}
    >
      <IconButton
        label="Delete"
        disabled={remove.isPending}
        onClick={() => {
          remove.reset();
          setOpen(true);
        }}
      >
        <Trash2Icon aria-hidden />
      </IconButton>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="leading-snug">
            Delete this source?
          </DialogTitle>
          <DialogDescription className="break-words">
            The agent stops using{" "}
            <span className="font-medium text-foreground">{source.name}</span>{" "}
            right away. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {remove.isError ? (
          <FieldError>Couldn&apos;t delete this source. Try again.</FieldError>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={remove.isPending}
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? (
              <Loader2Icon
                className="animate-spin"
                data-icon="inline-start"
                aria-hidden
              />
            ) : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourceRow({
  source,
  upload,
  onPreview,
  onEdit,
  onDismissUpload,
  entering,
}: {
  source: Source;
  upload: SourceUploadItem | undefined;
  onPreview: () => void;
  onEdit: () => void;
  onDismissUpload: (key: string) => void;
  entering: boolean;
}) {
  const [statusAtMount] = useState(source.status);
  const uploading = upload?.progress != null && !upload.error;
  const canPreview = source.chunkCount > 0 && !uploading;
  return (
    <RowShell
      kind={source.kind}
      name={source.name}
      meta={upload ? <UploadMeta upload={upload} /> : sourceMeta(source)}
      entering={entering}
      badge={
        uploading ? (
          <UploadingBadge />
        ) : (
          <StatusBadge
            key={source.status}
            status={source.status}
            changed={source.status !== statusAtMount}
          />
        )
      }
      {...(canPreview ? { onOpen: onPreview } : {})}
    >
      {canPreview ? (
        <IconButton label="View chunks" onClick={onPreview}>
          <EyeIcon aria-hidden />
        </IconButton>
      ) : null}
      {source.kind === "text" ? (
        <IconButton label="Edit" onClick={onEdit}>
          <PencilIcon aria-hidden />
        </IconButton>
      ) : null}
      {upload?.error ? (
        <IconButton label="Dismiss" onClick={() => onDismissUpload(upload.key)}>
          <XIcon aria-hidden />
        </IconButton>
      ) : null}
      {uploading ? null : <DeleteSourceButton source={source} />}
    </RowShell>
  );
}

export function KnowledgeSection() {
  const {
    data: { sources },
  } = useSuspenseQuery(orpc.knowledge.get.queryOptions());
  const uploads = useSourceUploads(sources);
  const isNew = useArrivals(sources.map((source) => source.id));
  const [rejections, setRejections] = useState<string[]>([]);
  const [textDialog, setTextDialog] = useState<{
    open: boolean;
    sourceId: string | null;
  }>({ open: false, sourceId: null });
  const [preview, setPreview] = useState<{
    open: boolean;
    source: { id: string; name: string } | null;
  }>({ open: false, source: null });

  const sourceIds = new Set(sources.map((source) => source.id));
  const uploadFor = new Map(
    uploads.items.flatMap((item) =>
      item.sourceId ? [[item.sourceId, item] as const] : [],
    ),
  );
  const pendingUploads = uploads.items.filter(
    (item) => item.sourceId === null || !sourceIds.has(item.sourceId),
  );
  const empty = sources.length === 0 && pendingUploads.length === 0;

  return (
    <SettingsSection
      id="sources"
      title="Sources"
      description="The agent answers only from these. Open a ready source to see the chunks it learned."
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => setTextDialog({ open: true, sourceId: null })}
        >
          <PlusIcon data-icon="inline-start" aria-hidden />
          Add text
        </Button>
      }
    >
      <div className="flex flex-col gap-2 p-4 md:p-5">
        <Dropzone
          multiple
          accept={SOURCE_FILE_EXTENSIONS}
          maxBytes={SOURCE_MAX_BYTES}
          title="Drag and drop your files"
          hint="PDF, Markdown or text, up to 10 MB each. A file with the same name replaces the old one."
          onFiles={(files) => {
            setRejections([]);
            uploads.upload(files);
          }}
          onReject={(rejected) =>
            setRejections(
              rejected.map((item) => `${item.fileName}: ${item.reason}`),
            )
          }
        />
        {rejections.map((message) => (
          <FieldError key={message} className="break-words">
            {message}
          </FieldError>
        ))}
      </div>

      {empty ? (
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No sources yet</EmptyTitle>
            <EmptyDescription>
              Upload a file or add some text. The agent stays off until a source
              is ready, so in the meantime every new conversation lands in your
              inbox as waiting and you reply yourself.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y">
          {pendingUploads.map((upload) => (
            <RowShell
              key={upload.key}
              entering
              kind="file"
              name={upload.name}
              meta={<UploadMeta upload={upload} />}
              badge={upload.error ? null : <UploadingBadge />}
            >
              {upload.error ? (
                <IconButton
                  label="Dismiss"
                  onClick={() => uploads.dismiss(upload.key)}
                >
                  <XIcon aria-hidden />
                </IconButton>
              ) : null}
            </RowShell>
          ))}
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              upload={uploadFor.get(source.id)}
              onPreview={() =>
                setPreview({
                  open: true,
                  source: { id: source.id, name: source.name },
                })
              }
              onEdit={() => setTextDialog({ open: true, sourceId: source.id })}
              onDismissUpload={uploads.dismiss}
              entering={isNew(source.id) && !uploadFor.has(source.id)}
            />
          ))}
        </ul>
      )}

      <TextSourceDialog
        open={textDialog.open}
        sourceId={textDialog.sourceId}
        onOpenChange={(open) =>
          setTextDialog((current) => ({ ...current, open }))
        }
      />
      <ChunkPreviewDialog
        open={preview.open}
        source={preview.source}
        onOpenChange={(open) => setPreview((current) => ({ ...current, open }))}
      />
    </SettingsSection>
  );
}
