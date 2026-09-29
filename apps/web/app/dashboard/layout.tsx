import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";
import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Providers } from "@/components/providers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireViewer } from "@/lib/auth/viewer";
import { orpcServer } from "@/lib/orpc/server";
import { getQueryClient } from "@/lib/query/client";

/** Must match `SIDEBAR_COOKIE_NAME` in `components/ui/sidebar.tsx`. */
const SIDEBAR_COOKIE_NAME = "sidebar_state";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireViewer(["ready"]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(
    orpcServer.owner.getCurrent.queryKey(),
    viewer.current,
  );

  const defaultOpen =
    (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <Providers>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SidebarProvider
          defaultOpen={defaultOpen}
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </HydrationBoundary>
    </Providers>
  );
}
