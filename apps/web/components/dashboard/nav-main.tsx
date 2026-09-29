"use client";

import { HouseIcon, InboxIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { type AppRoute, routes } from "@/lib/routes";

type NavItem = {
  title: string;
  href: AppRoute;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const items: readonly NavItem[] = [
  {
    title: "Home",
    href: routes.dashboard,
    icon: HouseIcon,
    isActive: (pathname) => pathname === routes.dashboard,
  },
  {
    title: "Inbox",
    href: routes.inbox,
    icon: InboxIcon,
    isActive: (pathname) =>
      pathname === routes.inbox || pathname.startsWith(`${routes.inbox}/`),
  },
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.isActive(pathname);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={active}
                  render={
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                    />
                  }
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
