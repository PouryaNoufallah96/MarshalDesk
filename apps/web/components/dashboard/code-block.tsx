"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const COPIED_FEEDBACK_MS = 2000;

const TOKEN_PATTERN = /(<\/?)([\w-]+)|("[^"]*")|([\w-]+)(?==|$)|(\/?>)/g;

/** Colours the HTML tags, attributes and values of a snippet. Monochrome on purpose. */
function highlightLine(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(line.slice(last, index));
    const [, open, tag, value, attribute, close] = match;
    if (tag) {
      nodes.push(
        <span key={index} className="text-white/45">
          {open}
          <span className="text-rose-300">{tag}</span>
        </span>,
      );
    } else if (value) {
      nodes.push(
        <span key={index} className="text-emerald-300">
          {value}
        </span>,
      );
    } else if (attribute) {
      nodes.push(
        <span key={index} className="text-sky-300">
          {attribute}
        </span>,
      );
    } else if (close) {
      nodes.push(
        <span key={index} className="text-white/45">
          {close}
        </span>,
      );
    }
    last = index + match[0].length;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

export function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(
      () => setCopied(false),
      COPIED_FEEDBACK_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Snippet copied");
    } catch {
      toast.error("Couldn't copy the snippet. Select it and copy it by hand.");
    }
  }

  return (
    <figure className="overflow-hidden rounded-xl bg-ink text-ink-foreground shadow-soft ring-1 ring-white/10">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 pr-1.5 pl-4">
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          <span
            aria-hidden
            className="mr-1 ml-1.5 size-[3px] rounded-full bg-current shadow-[-5px_0_0_currentColor,5px_0_0_currentColor]"
          />
          {label}
        </span>
        <Button
          type="button"
          variant="form-ghost"
          size="sm"
          className="gap-1.5 rounded-md px-2 text-xs"
          onClick={copy}
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" aria-hidden />
          ) : (
            <CopyIcon data-icon="inline-start" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </figcaption>
      <pre className="overflow-x-auto py-3.5 font-mono text-[13px]/6">
        <code className="grid">
          {lines.map((line, index) => (
            <Fragment key={index}>
              <span className="flex">
                <span
                  aria-hidden
                  className="w-10 shrink-0 pr-4 text-right text-ink-muted/40 select-none"
                >
                  {index + 1}
                </span>
                <span className="pr-4 whitespace-pre">
                  {highlightLine(line)}
                </span>
              </span>
            </Fragment>
          ))}
        </code>
      </pre>
    </figure>
  );
}
