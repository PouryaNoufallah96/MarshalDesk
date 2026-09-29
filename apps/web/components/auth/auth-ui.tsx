import { Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AuthHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children ? (
        <p className="text-sm text-balance text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-center text-sm text-destructive">
      {message}
    </p>
  );
}

export function FormNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-lg bg-muted px-3 py-2 text-center text-sm text-foreground"
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}
