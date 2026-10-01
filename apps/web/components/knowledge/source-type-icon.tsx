import { sourceFileExtension, type SourceKind } from "@marshaldesk/shared";
import { FileIcon, TextIcon } from "lucide-react";

/** A file icon tagged with its type, or the text icon for text sources. */
export function SourceTypeIcon({
  kind,
  name,
}: {
  kind: SourceKind;
  name: string;
}) {
  const extension = kind === "file" ? sourceFileExtension(name) : null;
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      {extension ? (
        <>
          <FileIcon className="size-5" strokeWidth={1.5} aria-hidden />
          <span className="absolute bottom-1 rounded-[3px] bg-foreground px-1 text-[8px] leading-3 font-semibold text-background">
            {extension.slice(1)}
          </span>
        </>
      ) : (
        <TextIcon className="size-4" aria-hidden />
      )}
    </span>
  );
}
