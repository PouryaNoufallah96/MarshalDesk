import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import { AccountButton } from "./account-button";
import { navLinks } from "./content";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  return (
    <header className="relative z-60 flex w-full max-w-[720px] shrink-0 animate-slide-down items-center justify-between gap-[clamp(18px,2.8vw,28px)] motion-reduce:animate-none nav:justify-center">
      <Link
        href="/"
        aria-label="MarshalDesk home"
        className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black shadow-soft transition-transform duration-300 ease-out-expo outline-none hover:scale-104 focus-visible:ring-3 focus-visible:ring-white/50 nav:size-[clamp(40px,4.4vw,46px)]"
      >
        <LogoMark className="size-[72%]" />
      </Link>

      <nav
        aria-label="Main"
        className="hidden h-[clamp(44px,5.2vw,48px)] max-w-[430px] flex-1 items-center justify-between rounded-full bg-white px-2 py-1 shadow-soft nav:flex"
      >
        {navLinks.map((link) => (
          <Button
            key={link.label}
            variant="nav"
            size="pill"
            className="h-full px-3"
            nativeButton={false}
            render={<Link href={link.href} />}
            aria-current={link.href === "/" ? "page" : undefined}
          >
            {link.label}
          </Button>
        ))}
      </nav>

      <AccountButton className="hidden nav:inline-flex" />

      <MobileMenu />
    </header>
  );
}
