"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Source,
  SourceNotFoundError,
  TEXT_SOURCE_MAX_LENGTH,
  type TextSource,
  type TextSourceInput,
  textSourceSchema,
} from "@marshaldesk/shared";
import { safe } from "@orpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { receiveSource } from "@/lib/knowledge/cache";
import { client, orpc } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";

const SAVE_FAILED = "Couldn't save this source. Try again.";

/** `sourceId` set: edits that text source. `null`: adds a new one. */
export function TextSourceDialog({
  open,
  onOpenChange,
  sourceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string | null;
}) {
  const editing = sourceId !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit text source" : "Add text"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Saving processes it again. The current version keeps answering until the new one is ready."
              : "Paste or write anything the agent should know, like a policy or an FAQ."}
          </DialogDescription>
        </DialogHeader>
        {sourceId ? (
          <EditTextSource
            key={sourceId}
            sourceId={sourceId}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <TextSourceForm
            defaultValues={{ title: "", text: "" }}
            sourceId={null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditTextSource({
  sourceId,
  onDone,
}: {
  sourceId: string;
  onDone: () => void;
}) {
  const detail = useQuery({
    ...orpc.knowledge.getSource.queryOptions({ input: { id: sourceId } }),
    staleTime: 0,
  });

  if (detail.isPending) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
        Loading the text…
      </p>
    );
  }
  if (detail.isError) {
    return (
      <FieldError className="py-6">
        {detail.error instanceof SourceNotFoundError
          ? detail.error.message
          : "Couldn't load this source. Try again."}
      </FieldError>
    );
  }
  return (
    <TextSourceForm
      sourceId={sourceId}
      defaultValues={{ title: detail.data.name, text: detail.data.text ?? "" }}
      onDone={onDone}
    />
  );
}

function TextSourceForm({
  sourceId,
  defaultValues,
  onDone,
}: {
  sourceId: string | null;
  defaultValues: TextSourceInput;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<TextSourceInput, unknown, TextSource>({
    resolver: zodResolver(textSourceSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;
  const text = useWatch({ control: form.control, name: "text" });
  const length = text.trim().length;
  const overLimit = length > TEXT_SOURCE_MAX_LENGTH;

  const onSubmit = form.handleSubmit(async (values) => {
    const [error, source] = await safe<Source>(
      sourceId
        ? client.knowledge.updateText({ id: sourceId, ...values })
        : client.knowledge.createText(values),
    );
    if (error) {
      form.setError("root", {
        message:
          error instanceof SourceNotFoundError ? error.message : SAVE_FAILED,
      });
      return;
    }
    receiveSource(queryClient, source);
    onDone();
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <Field data-invalid={!!errors.title}>
        <FieldLabel htmlFor="text-source-title">Title</FieldLabel>
        <Input
          id="text-source-title"
          size="lg"
          placeholder="Shipping policy"
          autoComplete="off"
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        <FieldError errors={[errors.title]} />
      </Field>
      <Field data-invalid={!!errors.text} className="min-h-0 flex-1">
        <FieldLabel htmlFor="text-source-text">Text</FieldLabel>
        <Textarea
          id="text-source-text"
          className="field-sizing-fixed h-72 min-h-40 resize-y"
          aria-invalid={!!errors.text}
          aria-describedby="text-source-count"
          {...form.register("text")}
        />
        <div className="flex items-start justify-between gap-4">
          <FieldError errors={[errors.text]} />
          <p
            id="text-source-count"
            className={cn(
              "ml-auto shrink-0 text-xs text-muted-foreground tabular-nums",
              overLimit && "text-destructive",
            )}
          >
            {length.toLocaleString("en-US")}/
            {TEXT_SOURCE_MAX_LENGTH.toLocaleString("en-US")}
          </p>
        </div>
      </Field>
      <FieldError errors={[errors.root]} />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2Icon
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
          ) : null}
          {sourceId ? "Save" : "Add source"}
        </Button>
      </DialogFooter>
    </form>
  );
}
