"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, "variant" | "type">,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        variant="ink"
        type={visible ? "text" : "password"}
        className="pr-12"
        {...props}
      />
      <div className="absolute inset-y-0 right-2 flex items-center">
        <Button
          type="button"
          variant="form-ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
