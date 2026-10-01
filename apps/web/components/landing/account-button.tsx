"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { dashboard, signIn } from "./content";

export function AccountButton({
  className,
  style,
  onNavigate,
}: {
  className?: string;
  style?: CSSProperties;
  onNavigate?: () => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;

  const link = session ? dashboard : signIn;
  return (
    <Button
      variant="ink"
      size="pill"
      className={className}
      style={style}
      nativeButton={false}
      render={<Link href={link.href} onClick={onNavigate} />}
    >
      {link.label}
    </Button>
  );
}
