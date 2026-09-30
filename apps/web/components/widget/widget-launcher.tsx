import { ChevronDownIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/** The round bubble that opens the widget. Its icon is fixed (PRD D-9). */
export function WidgetLauncher({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Close chat" : "Open chat"}
      aria-expanded={open}
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-full bg-(--widget-accent) text-(--widget-accent-foreground) shadow-[0_8px_28px_-4px_color-mix(in_oklch,var(--widget-accent)_65%,transparent)] transition-transform outline-none hover:scale-[1.04] focus-visible:ring-4 focus-visible:ring-(--widget-accent)/40 motion-reduce:transition-none",
        className,
      )}
    >
      {open ? (
        <ChevronDownIcon className="size-6" aria-hidden />
      ) : (
        <LogoMark className="size-7 [--logo-dots:var(--widget-accent)]" />
      )}
    </button>
  );
}
