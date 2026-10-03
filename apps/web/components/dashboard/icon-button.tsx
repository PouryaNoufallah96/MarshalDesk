"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** An icon-only button whose label is both its accessible name and a tooltip. */
export function IconButton({
  label,
  side = "top",
  variant = "ghost",
  size = "icon-sm",
  ...props
}: Omit<ComponentProps<typeof Button>, "aria-label"> & {
  label: string;
  side?: ComponentProps<typeof TooltipContent>["side"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={label}
            {...props}
          />
        }
      />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
