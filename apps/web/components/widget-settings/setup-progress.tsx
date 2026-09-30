import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SetupStep = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

/** Shows until every step is done (PRD D-10). */
export function SetupProgress({ steps }: { steps: readonly SetupStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const nextId = steps.find((step) => !step.done)?.id;

  return (
    <section
      aria-label="Setup"
      className="@container flex flex-col gap-3 rounded-xl bg-card p-1.5 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between gap-4 px-3 pt-2">
        <p className="text-sm font-medium">Get your widget live</p>
        <p className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
          <span aria-hidden className="flex items-center gap-1">
            {steps.map((step) => (
              <span
                key={step.id}
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-300",
                  step.done ? "bg-brand" : "bg-foreground/20",
                )}
              />
            ))}
          </span>
          {doneCount} of {steps.length} done
        </p>
      </div>
      <ol className="grid gap-1 @2xl:grid-cols-3">
        {steps.map((step, index) => {
          const next = step.id === nextId;
          return (
            <li key={step.id}>
              <a
                href={step.href}
                className={cn(
                  "flex h-full items-start gap-3 rounded-lg p-3 transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  next && "bg-brand/8",
                )}
              >
                <span
                  className={cn(
                    "mt-px grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-medium tabular-nums ring-1 ring-inset",
                    step.done
                      ? "bg-brand text-brand-foreground ring-brand"
                      : "text-muted-foreground ring-foreground/20",
                  )}
                >
                  {step.done ? (
                    <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm leading-tight font-medium",
                      step.done && "text-muted-foreground line-through",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {step.hint}
                  </span>
                  <span className="sr-only">
                    {step.done ? "(done)" : "(to do)"}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
