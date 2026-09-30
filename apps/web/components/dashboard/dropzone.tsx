"use client";

import { UploadCloudIcon } from "lucide-react";
import { type DragEvent, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DropzoneRejection = { fileName: string; reason: string };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * A drag-and-drop area that is also a file picker. Accepted files go to
 * `onFiles`, everything else to `onReject` with a readable reason.
 */
export function Dropzone({
  accept,
  maxBytes,
  multiple = false,
  disabled = false,
  onFiles,
  onReject,
  title = "Drag and drop files here",
  hint,
  compact = false,
  children,
  className,
}: {
  /** File extensions (".pdf") or MIME types ("image/png"). */
  accept: readonly string[];
  maxBytes: number;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onReject?: (rejections: DropzoneRejection[]) => void;
  title?: string;
  hint?: ReactNode;
  /** A single row instead of a stacked card, for small inline uploads. */
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Dragenter and dragleave also fire for children, so count them.
  const depth = useRef(0);

  function handle(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = multiple ? [...list] : [...list].slice(0, 1);
    const accepted: File[] = [];
    const rejected: DropzoneRejection[] = [];
    const megabytes = Math.round(maxBytes / (1024 * 1024));

    for (const file of files) {
      const allowed = accept.some((rule) =>
        rule.startsWith(".")
          ? extensionOf(file.name) === rule
          : file.type === rule,
      );
      if (!allowed) {
        rejected.push({
          fileName: file.name,
          reason: "This file type isn't supported.",
        });
      } else if (file.size > maxBytes) {
        rejected.push({
          fileName: file.name,
          reason: `Files can be up to ${megabytes} MB.`,
        });
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length > 0) onFiles(accepted);
    onReject?.(rejected);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (!disabled) handle(event.dataTransfer.files);
  }

  return (
    <label
      htmlFor={inputId}
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      data-compact={compact || undefined}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        "group/dropzone flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/20 bg-muted/30 px-6 py-8 text-center transition-colors duration-200 ease-out hover:border-foreground/40 hover:bg-muted/60 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 data-compact:flex-row data-compact:gap-3 data-compact:px-3.5 data-compact:py-3 data-compact:text-left data-dragging:border-foreground/60 data-dragging:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple={multiple}
        disabled={disabled}
        accept={accept.join(",")}
        className="sr-only"
        onChange={(event) => {
          handle(event.target.files);
          event.target.value = "";
        }}
      />
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground shadow-soft ring-1 ring-foreground/10 transition-transform duration-200 ease-out group-data-dragging/dropzone:-translate-y-1 group-data-dragging/dropzone:text-foreground motion-reduce:transition-none">
        <UploadCloudIcon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          {title}{" "}
          <span className="text-muted-foreground underline underline-offset-4 group-hover/dropzone:text-foreground group-data-compact/dropzone:hidden">
            or browse
          </span>
        </span>
        {hint ? (
          <span className="text-[13px] text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
