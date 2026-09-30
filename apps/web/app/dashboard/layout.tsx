import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";
import type { CSSProperties, ReactNode } from "react";
import { DashboardAccentProvider } from "@/components/dashboard/accent-provider";
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
  const widgetSettings = await queryClient.fetchQuery(
    orpcServer.widgetSettings.get.queryOptions(),
  );

  const defaultOpen =
    (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <Providers>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardAccentProvider initialColor={widgetSettings.settings.color}>
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--sidebar-width-icon": "calc(var(--spacing) * 13)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset className="isolate">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-t-xl bg-linear-to-b from-brand/[0.07] to-transparent"
              />
              <SiteHeader />
              {children}
            </SidebarInset>
          </SidebarProvider>
        </DashboardAccentProvider>
      </HydrationBoundary>
    </Providers>
  );
}
