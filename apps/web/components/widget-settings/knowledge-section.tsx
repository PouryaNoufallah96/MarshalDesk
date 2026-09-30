"use client";

import {
  SOURCE_FILE_EXTENSIONS,
  SOURCE_MAX_BYTES,
  type SourceStatus,
} from "@marshaldesk/shared";
import {
  CheckIcon,
  FileTextIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Dropzone } from "@/components/dashboard/dropzone";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { mockSources, type MockSource } from "@/lib/widget/mock-data";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: SourceStatus }) {
  switch (status) {
    case "uploaded":
      return <Badge variant="outline">Uploaded</Badge>;
    case "processing":
      return (
        <Badge
          variant="outline"
          className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"
        >
          <Loader2Icon className="animate-spin" aria-hidden />
          Processing
        </Badge>
      );
    case "ready":
      return (
        <Badge
          variant="outline"
          className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        >
          <CheckIcon aria-hidden />
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
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

export function KnowledgeSection() {
  const [sources, setSources] = useState<readonly MockSource[]>(mockSources);
  const [rejections, setRejections] = useState<string[]>([]);

  return (
    <SettingsSection
      id="knowledge"
      title="Knowledge base"
      description="The agent answers only from these sources."
    >
      <div className="flex flex-col gap-2 p-4 md:p-5">
        <Dropzone
          multiple
          accept={SOURCE_FILE_EXTENSIONS}
          maxBytes={SOURCE_MAX_BYTES}
          title="Drag and drop your files"
          hint="PDF, Markdown or text, up to 10 MB each."
          onFiles={(files) => {
            setRejections([]);
            setSources((current) => [
              ...files.map((file, index) => ({
                id: `upload-${Date.now()}-${index}`,
                name: file.name,
                bytes: file.size,
                status: "uploaded" as const,
              })),
              ...current,
            ]);
          }}
          onReject={(rejected) =>
            setRejections(
              rejected.map((item) => `${item.fileName}: ${item.reason}`),
            )
          }
        />
        {rejections.map((message) => (
          <FieldError key={message}>{message}</FieldError>
        ))}
      </div>

      <ul>
        {sources.map((source) => (
          <li
            key={source.id}
            className="flex items-center gap-3 py-2.5 pr-2.5 pl-4 md:pl-5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <FileTextIcon className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {source.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {source.failureReason ?? formatBytes(source.bytes)}
              </span>
            </span>
            <StatusBadge status={source.status} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${source.name}`}
              onClick={() =>
                setSources((current) =>
                  current.filter((item) => item.id !== source.id),
                )
              }
            >
              <XIcon aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <p className="bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground md:px-5">
        Uploading isn&apos;t available yet, so sources you add here aren&apos;t
        saved.
      </p>
    </SettingsSection>
  );
}
