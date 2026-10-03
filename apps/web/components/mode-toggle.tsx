"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Theme" />}
      >
        <SunIcon className="scale-100 rotate-0 opacity-100 transition-[scale,rotate,opacity] duration-200 ease-out motion-reduce:transition-opacity dark:scale-75 dark:-rotate-90 dark:opacity-0" />
        <MoonIcon className="absolute scale-75 rotate-90 opacity-0 transition-[scale,rotate,opacity] duration-200 ease-out motion-reduce:transition-opacity dark:scale-100 dark:rotate-0 dark:opacity-100" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
