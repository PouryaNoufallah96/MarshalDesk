import { ChevronDownIcon } from "lucide-react";
import type { Ref } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

function openLabel(unread: number): string {
  if (unread === 0) return "Open chat";
  return unread === 1
    ? "Open chat, 1 new reply"
    : `Open chat, ${unread} new replies`;
}

/** The round bubble that opens the widget. Its icon is fixed (PRD D-9). */
export function WidgetLauncher({
  open,
  unread = 0,
  onToggle,
  className,
  ref,
}: {
  open: boolean;
  /** Replies that arrived while the widget was closed. */
  unread?: number;
  onToggle?: () => void;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  const showUnread = !open && unread > 0;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-label={open ? "Close chat" : openLabel(unread)}
      aria-expanded={open}
      className={cn(
        "relative flex size-14 shrink-0 items-center justify-center rounded-full bg-(--widget-accent) text-(--widget-accent-foreground) shadow-[0_8px_28px_-4px_color-mix(in_oklch,var(--widget-accent)_65%,transparent)] transition-transform outline-none hover:scale-[1.04] focus-visible:ring-4 focus-visible:ring-(--widget-accent)/40 motion-reduce:transition-none",
        className,
      )}
    >
      {open ? (
        <ChevronDownIcon className="size-6" aria-hidden />
      ) : (
        <LogoMark className="size-7 [--logo-dots:var(--widget-accent)]" />
      )}
      {showUnread ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background tabular-nums ring-2 ring-background"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </button>
  );
}
