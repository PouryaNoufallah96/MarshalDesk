import { cn } from "@/lib/utils";

const DELAYS = ["0ms", "160ms", "320ms"];

/** The brand's three dots, pulsing in turn while someone types. */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-5 items-center gap-1", className)}>
      {DELAYS.map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none"
        />
      ))}
    </span>
  );
}
