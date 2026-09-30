import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A titled group of settings rows. Rows are divided, so the group reads as one surface. */
export function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn("flex scroll-mt-6 flex-col gap-3", className)}
    >
      <header className="flex items-end justify-between gap-4 px-0.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            id={titleId}
            className="text-base font-semibold tracking-[-0.01em]"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="@container divide-y overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10">
        {children}
      </div>
    </section>
  );
}

/** One setting: what it is on the left, the control on the right. Stacks on narrow screens. */
export function SettingsRow({
  label,
  htmlFor,
  description,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 p-4 @2xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] @2xl:gap-8 @2xl:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm leading-snug font-medium">
            {label}
          </label>
        ) : (
          <p className="text-sm leading-snug font-medium">{label}</p>
        )}
        {description ? (
          <p className="text-[13px]/snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}
