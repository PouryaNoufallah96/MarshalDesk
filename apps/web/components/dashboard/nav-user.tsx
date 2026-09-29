"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { EllipsisVerticalIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authRequest } from "@/components/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import { orpc } from "@/lib/orpc/client";
import { routes } from "@/lib/routes";

function initialsFor(name: string, email: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return initials || email.charAt(0).toUpperCase();
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const {
    data: { owner },
  } = useSuspenseQuery(orpc.owner.getCurrent.queryOptions());
  const [signingOut, setSigningOut] = useState(false);
  const signOutStarted = useRef(false);

  const initials = initialsFor(owner.name, owner.email);

  async function signOut() {
    if (signOutStarted.current) return;
    signOutStarted.current = true;
    setSigningOut(true);

    const error = await authRequest(() => authClient.signOut());
    if (error) {
      signOutStarted.current = false;
      setSigningOut(false);
      return;
    }
    router.replace(routes.signIn);
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={owner.avatarUrl} alt={owner.name} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{owner.name}</span>
              <span className="truncate text-xs text-foreground/80">
                {owner.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal text-foreground">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={owner.avatarUrl} alt={owner.name} />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{owner.name}</span>
                    <span className="truncate text-xs text-foreground/80">
                      {owner.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              closeOnClick={false}
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <LogOutIcon />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
