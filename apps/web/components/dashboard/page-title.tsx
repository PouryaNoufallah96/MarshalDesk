"use client";

import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";

function titleFor(pathname: string): string {
  if (pathname === routes.inbox || pathname.startsWith(`${routes.inbox}/`)) {
    return "Inbox";
  }
  return "Home";
}

export function PageTitle() {
  const pathname = usePathname();
  return (
    <p className="text-sm font-medium tracking-[-0.01em]">
      {titleFor(pathname)}
    </p>
  );
}
