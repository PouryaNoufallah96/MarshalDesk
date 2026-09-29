"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { navLinks, signIn } from "./content";

const bar =
  "absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-transform duration-300 ease-out-expo";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 721px)");
    const close = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ink"
            size="icon-pill"
            className="text-white hover:translate-y-0 data-popup-open:bg-white data-popup-open:text-black nav:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          />
        }
      >
        <span className="relative block h-[14.5px] w-[18px]">
          <span
            className={`${bar} top-0 group-data-popup-open/button:translate-y-[6.5px] group-data-popup-open/button:rotate-45`}
          />
          <span
            className={`${bar} top-[6.5px] transition-opacity group-data-popup-open/button:opacity-0`}
          />
          <span
            className={`${bar} top-[13px] group-data-popup-open/button:-translate-y-[6.5px] group-data-popup-open/button:-rotate-45`}
          />
        </span>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/62 data-open:animate-overlay-in supports-backdrop-filter:backdrop-blur-[6px]"
        className="top-[calc(clamp(16px,2.4vh,28px)+60px)] w-[calc(100%-28px)] max-w-sm translate-y-0 gap-1 rounded-[28px] bg-white px-[18px] pt-[22px] pb-5 text-black shadow-sheet ring-0 sm:max-w-sm data-open:animate-menu-in"
      >
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <nav aria-label="Main" className="flex flex-col items-stretch gap-1">
          {navLinks.map((link, i) => (
            <Button
              key={link.label}
              variant="nav"
              size="pill"
              className="animate-link-in text-base aria-[current=page]:after:bottom-2 motion-reduce:animate-none"
              style={{ animationDelay: `${0.06 + i * 0.05}s` }}
              nativeButton={false}
              render={<Link href={link.href} onClick={() => setOpen(false)} />}
              aria-current={link.href === "/" ? "page" : undefined}
            >
              {link.label}
            </Button>
          ))}
        </nav>
        <Button
          variant="ink"
          size="pill"
          className="mt-3 w-full animate-link-in text-base motion-reduce:animate-none"
          style={{ animationDelay: `${0.06 + navLinks.length * 0.05}s` }}
          nativeButton={false}
          render={<Link href={signIn.href} onClick={() => setOpen(false)} />}
        >
          {signIn.label}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
