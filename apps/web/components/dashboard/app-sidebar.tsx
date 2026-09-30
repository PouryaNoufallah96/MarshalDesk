import Link from "next/link";
import type { ComponentProps } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { NavMain } from "@/components/dashboard/nav-main";
import { NavUser } from "@/components/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="MarshalDesk"
              className="group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:gap-0 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:[&>span:last-child]:sr-only"
              render={<Link href={routes.dashboard} />}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background shadow-soft transition-transform duration-200 ease-out-expo group-hover/menu-button:scale-105 group-data-[collapsible=icon]:size-10">
                <LogoMark className="size-[72%] [--logo-dots:var(--foreground)]" />
              </span>
              <span className="text-base font-semibold tracking-[-0.02em]">
                MarshalDesk
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
